let recipesBySpawn = new Map();
let pricesByProduct = new Map();
let manualIngredientCounter = 0;
const CRAFT_DEBUG = true;
const DEFAULT_PRICE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/109TKx1gsQ0hHWyP3Qs4PquHKfoslCTd6SNB3YFT2TdI/edit?gid=0";

function debugLog(...args) {
  if (CRAFT_DEBUG) {
    console.log("[CraftCalc]", ...args);
  }
}

function debugWarn(...args) {
  if (CRAFT_DEBUG) {
    console.warn("[CraftCalc]", ...args);
  }
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseNumber(value) {
  if (value === null || value === undefined) {
    return NaN;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return NaN;
  }

  const withoutCurrency = trimmed.replace(/\$/g, "").replace(/\s/g, "");
  const normalized = withoutCurrency
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function showInfo(elementId, message, isError = false) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  element.style.display = "block";
  element.textContent = message;

  if (isError) {
    element.style.color = "#ff7b72";
    element.style.borderColor = "rgba(255, 123, 114, 0.4)";
    element.style.background = "rgba(255, 123, 114, 0.1)";
  } else {
    element.style.color = "var(--success)";
    element.style.borderColor = "rgba(63, 185, 80, 0.3)";
    element.style.background = "rgba(63, 185, 80, 0.1)";
  }
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index++;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(content) {
  const normalized = content.replace(/\r/g, "");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map(splitCsvLine);
}

function getGoogleSheetCsvUrl(inputUrl) {
  const url = String(inputUrl || "").trim();
  if (!url) {
    return null;
  }

  if (url.includes("tqx=out:csv")) {
    return url;
  }

  const spreadsheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!spreadsheetMatch) {
    return null;
  }

  const spreadsheetId = spreadsheetMatch[1];
  let gid = "0";

  const gidFromHash = url.match(/[#&?]gid=([0-9]+)/);
  if (gidFromHash && gidFromHash[1]) {
    gid = gidFromHash[1];
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
}

function extractPricesFromRows(rows) {
  const priceMap = new Map();

  if (!rows.length) {
    return priceMap;
  }

  const headerRow = rows[0];
  const lowerHeader = headerRow.map((column) => String(column).toLowerCase());

  const directProdutoIndex = lowerHeader.findIndex((col) => col === "produto");
  const directMinIndex = lowerHeader.findIndex((col) => col === "min");
  const directMaxIndex = lowerHeader.findIndex((col) => col === "max");

  if (
    directProdutoIndex !== -1 &&
    directMinIndex !== -1 &&
    directMaxIndex !== -1
  ) {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const product = row[directProdutoIndex];
      if (!product) {
        continue;
      }

      const min = parseNumber(row[directMinIndex]);
      const max = parseNumber(row[directMaxIndex]);
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        continue;
      }

      priceMap.set(normalizeKey(product), {
        produto: String(product).trim(),
        min,
        max,
      });
    }

    return priceMap;
  }

  const groupedColumns = [];
  for (let columnIndex = 0; columnIndex < headerRow.length; columnIndex++) {
    const header = String(headerRow[columnIndex] || "");
    if (header.toLowerCase().includes("produto")) {
      groupedColumns.push({
        produtoIndex: columnIndex,
        minIndex: columnIndex + 1,
        maxIndex: columnIndex + 2,
      });
    }
  }

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    groupedColumns.forEach((group) => {
      const product = row[group.produtoIndex];
      if (!product) {
        return;
      }

      const min = parseNumber(row[group.minIndex]);
      const max = parseNumber(row[group.maxIndex]);
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return;
      }

      priceMap.set(normalizeKey(product), {
        produto: String(product).trim(),
        min,
        max,
      });
    });
  }

  return priceMap;
}

function parseCraftConfig(content) {
  const recipes = new Map();

  const craftRegex =
    /\['([^']+)'\]\s*=\s*\{[\s\S]*?name\s*=\s*'([^']*)'[\s\S]*?quantidade\s*=\s*(\d+)[\s\S]*?ingredients\s*=\s*\{([\s\S]*?)\}\s*\}/g;

  let match;
  while ((match = craftRegex.exec(content)) !== null) {
    const spawn = String(match[1] || "").trim();
    const name = String(match[2] || spawn).trim();
    const rendimento = Number(match[3] || 1);
    const ingredientsBlock = match[4] || "";

    const ingredients = [];
    const ingredientEntryRegex = /\['([^']+)'\]\s*=\s*\{([\s\S]*?)\}/g;

    let ingredientEntryMatch;
    while (
      (ingredientEntryMatch = ingredientEntryRegex.exec(ingredientsBlock)) !==
      null
    ) {
      const ingredientSpawn = String(ingredientEntryMatch[1] || "").trim();
      const ingredientBody = String(ingredientEntryMatch[2] || "");

      const nameMatch = ingredientBody.match(/name\s*=\s*['\"]([^'\"]*)['\"]/i);
      const quantityMatch = ingredientBody.match(
        /quantity\s*=\s*([0-9]+(?:\.[0-9]+)?)/i,
      );

      const ingredientName = String(
        (nameMatch && nameMatch[1]) || ingredientSpawn,
      ).trim();
      const ingredientQuantity = Number(
        (quantityMatch && quantityMatch[1]) || 0,
      );

      if (ingredientSpawn && ingredientQuantity > 0) {
        ingredients.push({
          spawn: ingredientSpawn,
          name: ingredientName,
          quantity: ingredientQuantity,
        });
      } else if (ingredientSpawn) {
        debugWarn(
          `Ingrediente ignorado por quantidade inválida no craft ${spawn}`,
          {
            ingredientSpawn,
            ingredientBody,
          },
        );
      }
    }

    if (CRAFT_DEBUG) {
      console.groupCollapsed(
        `[CraftCalc] Craft parseado: ${name || spawn} (${spawn})`,
      );
      debugLog("Rendimento:", rendimento);
      debugLog("Bloco bruto de ingredientes:", ingredientsBlock);
      debugLog("Ingredientes parseados:", ingredients);
      console.groupEnd();
    }

    if (spawn && rendimento > 0) {
      recipes.set(normalizeKey(spawn), {
        spawn,
        name,
        rendimento,
        ingredients,
      });
    }
  }

  return recipes;
}

function updateCraftPreview() {
  const selectedCraftItems = document.getElementById("selectedCraftItems");
  const productSelect = document.getElementById("productSelect");
  const useManualCraft = document.getElementById("useManualCraft");

  if (!selectedCraftItems || !productSelect || !useManualCraft) {
    return;
  }

  if (useManualCraft.checked) {
    const manualSpawn = String(
      document.getElementById("manualCraftSpawn")?.value || "",
    ).trim();
    const manualName = String(
      document.getElementById("manualCraftName")?.value || "",
    ).trim();
    const manualYield = Number(
      document.getElementById("manualCraftYield")?.value || 1,
    );

    const ingredientRows = document.querySelectorAll(".manual-ingredient-row");
    const ingredientLines = [];
    ingredientRows.forEach((row) => {
      const rowId = row.dataset.rowId;
      const ingSpawn = String(
        document.getElementById(`manualIngSpawn-${rowId}`)?.value || "",
      ).trim();
      const ingName = String(
        document.getElementById(`manualIngName-${rowId}`)?.value || "",
      ).trim();
      const ingQty = Number(
        document.getElementById(`manualIngQty-${rowId}`)?.value || 0,
      );

      if (ingSpawn && ingQty > 0) {
        ingredientLines.push(
          `• ${ingName || ingSpawn} (${ingSpawn}) x${ingQty}`,
        );
      }
    });

    selectedCraftItems.innerHTML = `
      <div class="alert-title">Itens do Craft em Criação</div>
      <p><strong>${manualName || "(sem nome)"}</strong> (${manualSpawn || "sem spawn"})</p>
      <p>Rendimento por craft: <strong>${manualYield > 0 ? manualYield : 1}</strong></p>
      <p>${ingredientLines.length ? ingredientLines.join("<br>") : "• Adicione ingredientes para calcular."}</p>
    `;
    selectedCraftItems.style.display = "block";
    return;
  }

  const selectedKey = normalizeKey(productSelect.value);
  if (!selectedKey || !recipesBySpawn.has(selectedKey)) {
    selectedCraftItems.style.display = "none";
    selectedCraftItems.innerHTML = "";
    return;
  }

  const recipe = recipesBySpawn.get(selectedKey);
  const ingredientLines = recipe.ingredients.length
    ? recipe.ingredients
        .map(
          (ingredient) =>
            `• ${ingredient.name} (${ingredient.spawn}) x${ingredient.quantity}`,
        )
        .join("<br>")
    : "• Este craft não possui ingredientes cadastrados.";

  selectedCraftItems.innerHTML = `
    <div class="alert-title">Itens do Craft Selecionado</div>
    <p><strong>${recipe.name}</strong> (${recipe.spawn})</p>
    <p>Rendimento por craft: <strong>${recipe.rendimento}</strong></p>
    <p>${ingredientLines}</p>
  `;
  selectedCraftItems.style.display = "block";
}

function setManualModeUI(isEnabled) {
  const manualCraftSection = document.getElementById("manualCraftSection");
  const productSearch = document.getElementById("productSearch");
  const productSelect = document.getElementById("productSelect");
  const manualCraftAdvanced = document.getElementById("manualCraftAdvanced");

  if (
    !manualCraftSection ||
    !productSearch ||
    !productSelect ||
    !manualCraftAdvanced
  ) {
    return;
  }

  if (isEnabled) {
    manualCraftAdvanced.open = true;
  }

  manualCraftSection.style.display = isEnabled ? "block" : "none";
  productSearch.disabled = isEnabled;
  productSelect.disabled = isEnabled;
  productSearch.style.opacity = isEnabled ? "0.65" : "1";
  productSelect.style.opacity = isEnabled ? "0.65" : "1";
  updateCraftPreview();
}

function addManualIngredientRow(data = null) {
  manualIngredientCounter++;
  const rowId = manualIngredientCounter;
  const container = document.getElementById("manualIngredientsList");
  if (!container) {
    return;
  }

  const row = document.createElement("div");
  row.className = "form-row manual-ingredient-row";
  row.dataset.rowId = String(rowId);
  row.style =
    "margin-bottom: 0.5rem; padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px;";

  row.innerHTML = `
    <div class="form-group" style="flex: 1;">
      <label>Spawn do Ingrediente</label>
      <input type="text" id="manualIngSpawn-${rowId}" placeholder="ferro" value="${data && data.spawn ? data.spawn : ""}">
    </div>
    <div class="form-group" style="flex: 1;">
      <label>Nome do Ingrediente</label>
      <input type="text" id="manualIngName-${rowId}" placeholder="Ferro" value="${data && data.name ? data.name : ""}">
    </div>
    <div class="form-group" style="flex: 0.5;">
      <label>Quantidade</label>
      <input type="number" id="manualIngQty-${rowId}" min="1" value="${data && data.quantity ? data.quantity : 1}">
    </div>
    <div class="form-group" style="flex: 0;">
      <label style="visibility: hidden;">-</label>
      <button class="btn-secondary btn-compact" type="button" onclick="removeManualIngredientRow(${rowId})" style="background: #d32f2f;">X</button>
    </div>
  `;

  container.appendChild(row);
}

function removeManualIngredientRow(rowId) {
  const row = document.querySelector(
    `.manual-ingredient-row[data-row-id="${rowId}"]`,
  );
  if (row) {
    row.remove();
    updateCraftPreview();
  }
}

function buildManualRecipeFromForm() {
  const manualCraftSpawn = String(
    document.getElementById("manualCraftSpawn")?.value || "",
  ).trim();
  const manualCraftName = String(
    document.getElementById("manualCraftName")?.value || "",
  ).trim();
  const manualCraftYield = Number(
    document.getElementById("manualCraftYield")?.value || 1,
  );

  if (!manualCraftSpawn) {
    alert("⚠️ Informe o spawn do craft em criação.");
    return null;
  }

  if (!manualCraftName) {
    alert("⚠️ Informe o nome do craft em criação.");
    return null;
  }

  if (!Number.isFinite(manualCraftYield) || manualCraftYield <= 0) {
    alert("⚠️ Informe um rendimento válido para o craft em criação.");
    return null;
  }

  const ingredients = [];
  const ingredientRows = document.querySelectorAll(".manual-ingredient-row");

  ingredientRows.forEach((row) => {
    const rowId = row.dataset.rowId;
    const spawn = String(
      document.getElementById(`manualIngSpawn-${rowId}`)?.value || "",
    ).trim();
    const name = String(
      document.getElementById(`manualIngName-${rowId}`)?.value || "",
    ).trim();
    const quantity = Number(
      document.getElementById(`manualIngQty-${rowId}`)?.value || 0,
    );

    if (spawn && Number.isFinite(quantity) && quantity > 0) {
      ingredients.push({
        spawn,
        name: name || spawn,
        quantity,
      });
    }
  });

  if (!ingredients.length) {
    alert("⚠️ Adicione pelo menos um ingrediente válido no craft em criação.");
    return null;
  }

  return {
    spawn: manualCraftSpawn,
    name: manualCraftName,
    rendimento: manualCraftYield,
    ingredients,
  };
}

function addOrAccumulateBaseItem(baseItems, itemKey, itemMeta, quantity) {
  const existing = baseItems.get(itemKey) || {
    spawn: (itemMeta && itemMeta.spawn) || itemKey,
    name:
      (itemMeta && (itemMeta.name || itemMeta.spawn)) ||
      (itemMeta && itemMeta.spawn) ||
      itemKey,
    quantity: 0,
  };

  if (itemMeta && itemMeta.name && existing.name === existing.spawn) {
    existing.name = itemMeta.name;
  }

  existing.quantity += quantity;
  baseItems.set(itemKey, existing);
}

function expandRecipeIngredients(
  recipe,
  quantityNeeded,
  baseItems,
  path = [],
  recipeKeyHint = "",
  cycleWarnings = null,
) {
  const currentRecipeKey = normalizeKey(
    recipe.spawn || recipe.name || recipeKeyHint || "manual_root",
  );

  if (path.includes(currentRecipeKey)) {
    const cyclePath = [...path, currentRecipeKey].join(" -> ");
    if (cycleWarnings && typeof cycleWarnings.add === "function") {
      cycleWarnings.add(cyclePath);
    }

    addOrAccumulateBaseItem(
      baseItems,
      currentRecipeKey,
      {
        spawn: recipe.spawn || currentRecipeKey,
        name: recipe.name || recipe.spawn || currentRecipeKey,
      },
      quantityNeeded,
    );
    return;
  }

  const craftsNeeded = Math.ceil(quantityNeeded / recipe.rendimento);
  recipe.ingredients.forEach((ingredient) => {
    const ingredientKey = normalizeKey(ingredient.spawn);
    const totalIngredientQuantity = ingredient.quantity * craftsNeeded;

    const nestedRecipe = recipesBySpawn.get(ingredientKey);
    if (nestedRecipe) {
      expandRecipeIngredients(
        nestedRecipe,
        totalIngredientQuantity,
        baseItems,
        [...path, currentRecipeKey],
        ingredientKey,
        cycleWarnings,
      );
      return;
    }

    addOrAccumulateBaseItem(
      baseItems,
      ingredientKey,
      {
        spawn: ingredient.spawn,
        name: ingredient.name,
      },
      totalIngredientQuantity,
    );
  });
}

function updateProductSelect(searchTerm = "") {
  const select = document.getElementById("productSelect");
  if (!select) {
    return;
  }

  select.innerHTML = "";
  if (!recipesBySpawn.size) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Carregue o arquivo de crafts primeiro";
    select.appendChild(emptyOption);
    return;
  }

  const normalizedSearch = normalizeKey(searchTerm);

  const recipes = Array.from(recipesBySpawn.values())
    .filter((recipe) => {
      if (!normalizedSearch) {
        return true;
      }

      const byName = normalizeKey(recipe.name).includes(normalizedSearch);
      const bySpawn = normalizeKey(recipe.spawn).includes(normalizedSearch);
      return byName || bySpawn;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  if (!recipes.length) {
    const emptySearchOption = document.createElement("option");
    emptySearchOption.value = "";
    emptySearchOption.textContent = "Nenhum craft encontrado para a pesquisa";
    select.appendChild(emptySearchOption);
    updateCraftPreview();
    return;
  }

  recipes.forEach((recipe) => {
    const option = document.createElement("option");
    option.value = normalizeKey(recipe.spawn);
    option.textContent = `${recipe.name} (${recipe.spawn})`;
    select.appendChild(option);
  });

  updateCraftPreview();
}

function expandIngredients(
  itemKey,
  quantityNeeded,
  baseItems,
  path = [],
  itemMeta = null,
) {
  if (path.includes(itemKey)) {
    throw new Error(
      `Dependência cíclica detectada: ${[...path, itemKey].join(" -> ")}`,
    );
  }

  const recipe = recipesBySpawn.get(itemKey);
  if (!recipe) {
    const existing = baseItems.get(itemKey) || {
      spawn: (itemMeta && itemMeta.spawn) || itemKey,
      name:
        (itemMeta && (itemMeta.name || itemMeta.spawn)) ||
        (itemMeta && itemMeta.spawn) ||
        itemKey,
      quantity: 0,
    };

    if (itemMeta && itemMeta.name && existing.name === existing.spawn) {
      existing.name = itemMeta.name;
    }

    existing.quantity += quantityNeeded;
    baseItems.set(itemKey, existing);
    return;
  }

  const craftsNeeded = Math.ceil(quantityNeeded / recipe.rendimento);
  recipe.ingredients.forEach((ingredient) => {
    const ingredientKey = normalizeKey(ingredient.spawn);
    const totalIngredientQuantity = ingredient.quantity * craftsNeeded;

    expandIngredients(
      ingredientKey,
      totalIngredientQuantity,
      baseItems,
      [...path, itemKey],
      {
        spawn: ingredient.spawn,
        name: ingredient.name,
      },
    );
  });
}

function resolvePriceForItem(item) {
  const candidates = [item.spawn, item.name]
    .filter((value) => value && String(value).trim())
    .map((value) => normalizeKey(value));

  for (const candidate of candidates) {
    if (pricesByProduct.has(candidate)) {
      return pricesByProduct.get(candidate);
    }
  }

  return null;
}

function calculateCraftCost() {
  if (!pricesByProduct.size) {
    alert("⚠️ Carregue primeiro a planilha de custos.");
    return;
  }

  const productSelect = document.getElementById("productSelect");
  const desiredQuantityInput = document.getElementById("desiredQuantity");
  const useManualCraft = document.getElementById("useManualCraft");

  const desiredQuantity = Number(desiredQuantityInput.value);
  const isManual = Boolean(useManualCraft && useManualCraft.checked);
  let recipe = null;

  if (!isManual && !recipesBySpawn.size) {
    alert("⚠️ Carregue primeiro o arquivo de crafts.");
    return;
  }

  if (isManual) {
    recipe = buildManualRecipeFromForm();
    if (!recipe) {
      return;
    }
  } else {
    const selectedKey = normalizeKey(productSelect.value);
    if (!selectedKey || !recipesBySpawn.has(selectedKey)) {
      alert("⚠️ Selecione um produto válido.");
      return;
    }
    recipe = recipesBySpawn.get(selectedKey);
  }

  if (!Number.isFinite(desiredQuantity) || desiredQuantity <= 0) {
    alert("⚠️ Informe uma quantidade desejada maior que zero.");
    return;
  }

  const baseItems = new Map();
  const cycleWarnings = new Set();

  try {
    expandRecipeIngredients(
      recipe,
      desiredQuantity,
      baseItems,
      [],
      recipe.spawn,
      cycleWarnings,
    );
  } catch (error) {
    alert(`❌ ${error.message}`);
    return;
  }

  const rows = [];
  const missingPrices = [];
  let totalMin = 0;
  let totalMax = 0;

  Array.from(baseItems.values())
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .forEach((item) => {
      const price = resolvePriceForItem(item);
      const unitMin = price ? price.min : null;
      const unitMax = price ? price.max : null;
      const itemMin = unitMin !== null ? item.quantity * unitMin : null;
      const itemMax = unitMax !== null ? item.quantity * unitMax : null;

      if (itemMin === null || itemMax === null) {
        missingPrices.push(item.name);
      } else {
        totalMin += itemMin;
        totalMax += itemMax;
      }

      rows.push(`
        <tr>
          <td style="padding: 0.75rem; border-bottom: 1px solid var(--border);">${item.name}</td>
          <td style="padding: 0.75rem; border-bottom: 1px solid var(--border);">${item.spawn}</td>
          <td style="padding: 0.75rem; border-bottom: 1px solid var(--border); text-align: right;">${item.quantity}</td>
          <td style="padding: 0.75rem; border-bottom: 1px solid var(--border); text-align: right;">${unitMin !== null ? formatCurrency(unitMin) : "-"}</td>
          <td style="padding: 0.75rem; border-bottom: 1px solid var(--border); text-align: right;">${unitMax !== null ? formatCurrency(unitMax) : "-"}</td>
          <td style="padding: 0.75rem; border-bottom: 1px solid var(--border); text-align: right;">${itemMin !== null ? formatCurrency(itemMin) : "-"}</td>
          <td style="padding: 0.75rem; border-bottom: 1px solid var(--border); text-align: right;">${itemMax !== null ? formatCurrency(itemMax) : "-"}</td>
        </tr>
      `);
    });

  const totalAverage = (totalMin + totalMax) / 2;
  const craftsNeeded = Math.ceil(desiredQuantity / recipe.rendimento);
  const totalProduced = craftsNeeded * recipe.rendimento;

  const costPerCraftMin = craftsNeeded > 0 ? totalMin / craftsNeeded : 0;
  const costPerCraftMax = craftsNeeded > 0 ? totalMax / craftsNeeded : 0;
  const costPerCraftAverage =
    craftsNeeded > 0 ? totalAverage / craftsNeeded : 0;

  const costPerProducedItemMin =
    totalProduced > 0 ? totalMin / totalProduced : 0;
  const costPerProducedItemMax =
    totalProduced > 0 ? totalMax / totalProduced : 0;
  const costPerProducedItemAverage =
    totalProduced > 0 ? totalAverage / totalProduced : 0;

  const warningMessages = [];

  if (missingPrices.length) {
    warningMessages.push(`
      <div class="alert" style="margin-top: 1rem; border-color: rgba(255, 123, 114, 0.4); background: rgba(255, 123, 114, 0.1);">
        <div class="alert-title" style="color: #ff7b72;">⚠️ Preço não encontrado para:</div>
        <p>${missingPrices.join(", ")}</p>
      </div>
    `);
  }

  if (cycleWarnings.size) {
    warningMessages.push(`
      <div class="alert" style="margin-top: 1rem; border-color: rgba(255, 166, 87, 0.45); background: rgba(255, 166, 87, 0.12);">
        <div class="alert-title" style="color: #ffb86b;">⚠️ Dependência cíclica detectada</div>
        <p>Alguns itens possuem loop de receitas e foram tratados como item base para o cálculo continuar.</p>
        <p>${Array.from(cycleWarnings).join("<br>")}</p>
      </div>
    `);
  }

  const warningBlock = warningMessages.join("");

  const resultContainer = document.getElementById("resultContainer");
  const resultEmpty = document.getElementById("resultEmpty");

  resultContainer.innerHTML = `
    <div class="craft-summary">
      <div class="craft-summary-header">
        <div>
          <div class="craft-summary-title">Resumo do Cálculo</div>
          <div class="craft-summary-subtitle">${recipe.name} (${recipe.spawn})</div>
        </div>
        <div class="craft-summary-highlight">
          <span class="craft-summary-highlight-label">Custo unitário médio</span>
          <strong class="craft-summary-highlight-value">${formatCurrency(costPerProducedItemAverage)}</strong>
        </div>
      </div>

      <div class="craft-summary-grid">
        <div class="craft-summary-card">
          <h4>Produção</h4>
          <div class="craft-summary-row"><span>Quantidade desejada</span><strong>${desiredQuantity}</strong></div>
          <div class="craft-summary-row"><span>Rendimento por craft</span><strong>${recipe.rendimento}</strong></div>
          <div class="craft-summary-row"><span>Crafts necessários</span><strong>${craftsNeeded}</strong></div>
          <div class="craft-summary-row"><span>Total produzido</span><strong>${totalProduced}</strong></div>
        </div>

        <div class="craft-summary-card">
          <h4>Custos Totais</h4>
          <div class="craft-summary-row"><span>Mínimo</span><strong>${formatCurrency(totalMin)}</strong></div>
          <div class="craft-summary-row"><span>Máximo</span><strong>${formatCurrency(totalMax)}</strong></div>
          <div class="craft-summary-row"><span>Médio</span><strong>${formatCurrency(totalAverage)}</strong></div>
        </div>

        <div class="craft-summary-card">
          <h4>Custo por Craft</h4>
          <div class="craft-summary-row"><span>Mínimo</span><strong>${formatCurrency(costPerCraftMin)}</strong></div>
          <div class="craft-summary-row"><span>Máximo</span><strong>${formatCurrency(costPerCraftMax)}</strong></div>
          <div class="craft-summary-row"><span>Médio</span><strong>${formatCurrency(costPerCraftAverage)}</strong></div>
        </div>

        <div class="craft-summary-card">
          <h4>Custo por Item</h4>
          <div class="craft-summary-row"><span>Mínimo</span><strong>${formatCurrency(costPerProducedItemMin)}</strong></div>
          <div class="craft-summary-row"><span>Máximo</span><strong>${formatCurrency(costPerProducedItemMax)}</strong></div>
          <div class="craft-summary-row"><span>Médio</span><strong>${formatCurrency(costPerProducedItemAverage)}</strong></div>
        </div>
      </div>
    </div>

    <div style="overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; background: rgba(13, 17, 23, 0.6); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
        <thead>
          <tr style="background: rgba(88, 166, 255, 0.15);">
            <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border);">Item</th>
            <th style="padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border);">Spawn</th>
            <th style="padding: 0.75rem; text-align: right; border-bottom: 1px solid var(--border);">Qtd</th>
            <th style="padding: 0.75rem; text-align: right; border-bottom: 1px solid var(--border);">Min Unit.</th>
            <th style="padding: 0.75rem; text-align: right; border-bottom: 1px solid var(--border);">Max Unit.</th>
            <th style="padding: 0.75rem; text-align: right; border-bottom: 1px solid var(--border);">Total Min</th>
            <th style="padding: 0.75rem; text-align: right; border-bottom: 1px solid var(--border);">Total Max</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join("")}
        </tbody>
      </table>
    </div>

    ${warningBlock}
  `;

  resultContainer.style.display = "block";
  resultEmpty.style.display = "none";
}

function loadCraftConfigFile(file) {
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const content = String(event.target.result || "");
      debugLog("Arquivo de craft carregado", {
        fileName: file.name,
        fileSize: file.size,
        contentLength: content.length,
      });

      recipesBySpawn = parseCraftConfig(content);

      if (CRAFT_DEBUG) {
        const summary = Array.from(recipesBySpawn.values()).map((recipe) => ({
          spawn: recipe.spawn,
          nome: recipe.name,
          rendimento: recipe.rendimento,
          ingredientes: recipe.ingredients.length,
        }));
        console.table(summary);
      }

      if (!recipesBySpawn.size) {
        showInfo(
          "craftConfigInfo",
          "❌ Nenhuma receita válida encontrada no arquivo.",
          true,
        );
        debugWarn("Nenhuma receita foi extraída do arquivo.");
        updateProductSelect();
        return;
      }

      const recipesWithoutIngredients = Array.from(recipesBySpawn.values())
        .filter((recipe) => !recipe.ingredients.length)
        .map((recipe) => `${recipe.name} (${recipe.spawn})`);

      if (recipesWithoutIngredients.length) {
        debugWarn(
          "Receitas sem ingredientes parseados:",
          recipesWithoutIngredients,
        );
      }

      updateProductSelect();
      showInfo(
        "craftConfigInfo",
        `✅ ${recipesBySpawn.size} receita(s) carregada(s) do arquivo \"${file.name}\".`,
      );
    } catch (error) {
      showInfo(
        "craftConfigInfo",
        `❌ Erro ao processar receitas: ${error.message}`,
        true,
      );
      recipesBySpawn = new Map();
      updateProductSelect();
    }
  };

  reader.readAsText(file);
}

function loadPricesFromCsvContent(csvContent, sourceLabel) {
  const rows = parseCsv(csvContent);
  pricesByProduct = extractPricesFromRows(rows);

  if (!pricesByProduct.size) {
    showInfo(
      "priceInfo",
      "❌ Não foi possível identificar colunas de preços (Produto/Min/Max) na planilha.",
      true,
    );
    return;
  }

  showInfo(
    "priceInfo",
    `✅ ${pricesByProduct.size} preço(s) carregado(s) (${sourceLabel}).`,
  );
}

function registerEvents() {
  const craftConfigInput = document.getElementById("craftConfigInput");
  const loadPriceFromUrlBtn = document.getElementById("loadPriceFromUrlBtn");
  const calculateCraftBtn = document.getElementById("calculateCraftBtn");
  const productSearch = document.getElementById("productSearch");
  const productSelect = document.getElementById("productSelect");
  const useManualCraft = document.getElementById("useManualCraft");
  const addManualIngredientBtn = document.getElementById(
    "addManualIngredientBtn",
  );
  const manualCraftSection = document.getElementById("manualCraftSection");

  craftConfigInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    loadCraftConfigFile(file);
  });

  productSearch.addEventListener("input", (event) => {
    const term = String(event.target.value || "");
    updateProductSelect(term);
  });

  productSelect.addEventListener("change", () => {
    updateCraftPreview();
  });

  useManualCraft.addEventListener("change", (event) => {
    setManualModeUI(Boolean(event.target.checked));
  });

  addManualIngredientBtn.addEventListener("click", () => {
    addManualIngredientRow();
    updateCraftPreview();
  });

  manualCraftSection.addEventListener("input", () => {
    updateCraftPreview();
  });

  loadPriceFromUrlBtn.addEventListener("click", async () => {
    const urlInput = document.getElementById("priceCsvUrl");
    const typedUrl = String(urlInput.value || "").trim();
    const url = typedUrl || DEFAULT_PRICE_SHEET_URL;

    if (!typedUrl) {
      urlInput.value = DEFAULT_PRICE_SHEET_URL;
    }

    const csvUrl = getGoogleSheetCsvUrl(url);
    if (!csvUrl) {
      showInfo(
        "priceInfo",
        "❌ Link inválido. Use o link da planilha do Google Sheets.",
        true,
      );
      return;
    }

    try {
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Falha HTTP ${response.status}`);
      }
      const csvText = await response.text();
      loadPricesFromCsvContent(csvText, "planilha");
    } catch (error) {
      showInfo(
        "priceInfo",
        `❌ Erro ao carregar planilha de preços: ${error.message}`,
        true,
      );
    }
  });

  calculateCraftBtn.addEventListener("click", calculateCraftCost);

  addManualIngredientRow();
  addManualIngredientRow();
  setManualModeUI(false);
}

registerEvents();
