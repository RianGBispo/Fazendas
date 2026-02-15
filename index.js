let generatedConfig = "";

// Definir animais por tier
const animalsByTier = {
  prata: ["pig", "goat"],
  ouro: ["pig", "goat", "sheep", "donkey"],
  ultimate: ["pig", "goat", "sheep", "donkey", "cow", "chicken", "buffalo"],
};

function updateAnimalFields() {
  const tier = document.getElementById("nurseryType").value;
  const allAnimals = [
    "pig",
    "goat",
    "sheep",
    "donkey",
    "cow",
    "chicken",
    "buffalo",
  ];
  const activeAnimals = animalsByTier[tier];

  allAnimals.forEach((animal) => {
    const card = document.getElementById(`animal-${animal}`);
    if (activeAnimals.includes(animal)) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}

function parseCoords(coordString, isVec3 = false) {
  const cleaned = coordString.replace(/[{}\s]/g, "");
  const values = cleaned.split(",").map((v) => v.trim());

  if (isVec3) {
    return `vec3(${values[0]}, ${values[1]}, ${values[2]})`;
  } else {
    return `vec4(${values[0]}, ${values[1]}, ${values[2]}, ${values[3]})`;
  }
}

function generateAnimalConfig(animalName, itemName, maleId, femaleId) {
  const maleInput = document.getElementById(maleId);
  const femaleInput = document.getElementById(femaleId);

  if (!maleInput.value || !femaleInput.value) {
    return null;
  }

  return `            ${animalName} = {
                ItemsRequired = {
                    ['${itemName}'] = 1,
                },
                PlaybackTime = 1 * 420,
                Positions = {
                    {
                        Male = ${parseCoords(maleInput.value)},
                        Female = ${parseCoords(femaleInput.value)},
                    },
                }
            }`;
}

function generateConfig() {
  try {
    const orgName = document.getElementById("orgName").value || "fazenda_27";
    const configLabel =
      document.getElementById("configLabel").value || "fazenda_27";
    const tier = document.getElementById("nurseryType").value;

    const workTableCoords = parseCoords(
      document.getElementById("workTableCoords").value,
      true,
    );
    const workTableHeading = "40.433";

    const activeAnimals = animalsByTier[tier];
    const animalConfigs = [];

    // Definição dos animais
    const animalDefinitions = {
      pig: {
        name: "Pig",
        item: "LibidgelSuino",
        maleId: "pigMale",
        femaleId: "pigFemale",
      },
      goat: {
        name: "Goat",
        item: "LibidgelCaprino",
        maleId: "goatMale",
        femaleId: "goatFemale",
      },
      sheep: {
        name: "Sheep",
        item: "LibidgelOvino",
        maleId: "sheepMale",
        femaleId: "sheepFemale",
      },
      donkey: {
        name: "Donkey",
        item: "LibidgelAsneiro",
        maleId: "donkeyMale",
        femaleId: "donkeyFemale",
      },
      cow: {
        name: "Cow",
        item: "LibidgelBovino",
        maleId: "cowMale",
        femaleId: "cowFemale",
      },
      chicken: {
        name: "Chicken",
        item: "LibidgelAviario",
        maleId: "chickenMale",
        femaleId: "chickenFemale",
      },
      buffalo: {
        name: "Buffalo",
        item: "LibidgelBufalino",
        maleId: "buffaloMale",
        femaleId: "buffaloFemale",
      },
    };

    // Gerar configs apenas dos animais ativos
    activeAnimals.forEach((animalKey) => {
      const def = animalDefinitions[animalKey];
      const config = generateAnimalConfig(
        def.name,
        def.item,
        def.maleId,
        def.femaleId,
      );
      if (config) {
        animalConfigs.push(config);
      }
    });

    if (animalConfigs.length === 0) {
      alert(
        "⚠️ Preencha pelo menos as posições dos animais do tipo selecionado.",
      );
      return;
    }

    generatedConfig = `['${orgName}'] = {
        Config = {
            Label = '${configLabel}',
            Zone = {
                ClearRadius = false,
                DistanteClear = 150,
                PointCenter = ${workTableCoords}
            }
        },
        WorkTable = {
            SpawnObject = {
                Spawn = false,
                Model = 'p_benchwork01x',
                Coords = ${workTableCoords},
                Heading = ${workTableHeading}
            },
            GetServiceCoords = ${workTableCoords}
        },
        Creators = {
${animalConfigs.join(",\n\n")}
        }
    },`;

    document.getElementById("downloadBtn").disabled = false;
    alert(
      "✅ Configuração gerada com sucesso! Agora você pode baixar o arquivo.",
    );
  } catch (error) {
    alert(
      "❌ Erro ao gerar configuração. Verifique se todos os campos estão preenchidos corretamente.",
    );
    console.error(error);
  }
}

function downloadConfig() {
  if (!generatedConfig) {
    alert("⚠️ Por favor, gere a configuração primeiro.");
    return;
  }

  const blob = new Blob([generatedConfig], {
    type: "text/plain;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  const orgName = document.getElementById("orgName").value || "fazenda_27";
  const tier = document.getElementById("nurseryType").value;
  a.href = url;
  a.download = `bercario_${tier}_${orgName}.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Função para converter vec3/vec4 para formato de input
function vecToInputFormat(vecString) {
  // Remove vec3( ou vec4( e o parêntese final
  const cleaned = vecString.replace(/vec[34]\(/, "").replace(/\)$/, "");
  const values = cleaned.split(",").map((v) => v.trim());
  return `{${values.join(", ")}}`;
}

// Função para extrair coordenadas de uma string vec3 ou vec4
function extractCoords(vecString) {
  const match = vecString.match(/vec[34]\(([^)]+)\)/);
  if (match) {
    return match[1]
      .split(",")
      .map((v) => v.trim())
      .join(", ");
  }
  return "";
}

// Função para fazer parse do arquivo de configuração
function parseConfigFile(content) {
  try {
    const config = {};

    // Extrair nome da organização (chave principal)
    const orgMatch = content.match(/\[['"]([^'"]+)['"]\]\s*=/);
    if (orgMatch) {
      config.orgName = orgMatch[1];
    }

    // Extrair Label
    const labelMatch = content.match(/Label\s*=\s*['"]([^'"]+)['"]/);
    if (labelMatch) {
      config.label = labelMatch[1];
    }

    // Extrair WorkTable Coords (pode estar em SpawnObject.Coords ou GetServiceCoords)
    let workTableMatch = content.match(/Coords\s*=\s*(vec3\([^)]+\))/);
    if (!workTableMatch) {
      workTableMatch = content.match(/GetServiceCoords\s*=\s*(vec3\([^)]+\))/);
    }
    if (workTableMatch) {
      config.workTableCoords = vecToInputFormat(workTableMatch[1]);
    }

    // Mapeamento de nomes de animais para IDs
    const animalMapping = {
      Pig: { key: "pig", maleId: "pigMale", femaleId: "pigFemale" },
      Goat: { key: "goat", maleId: "goatMale", femaleId: "goatFemale" },
      Sheep: { key: "sheep", maleId: "sheepMale", femaleId: "sheepFemale" },
      Donkey: { key: "donkey", maleId: "donkeyMale", femaleId: "donkeyFemale" },
      Cow: { key: "cow", maleId: "cowMale", femaleId: "cowFemale" },
      Chicken: {
        key: "chicken",
        maleId: "chickenMale",
        femaleId: "chickenFemale",
      },
      Buffalo: {
        key: "buffalo",
        maleId: "buffaloMale",
        femaleId: "buffaloFemale",
      },
    };

    // Extrair posições dos animais
    config.animals = {};
    const foundAnimals = [];

    for (const [animalName, mapping] of Object.entries(animalMapping)) {
      // Buscar bloco do animal usando uma abordagem mais flexível
      // Procura por: AnimalName = { ... Positions = { { Male = vec4(...), Female = vec4(...) } } }
      // Primeiro, encontrar o início do bloco do animal
      const animalStartRegex = new RegExp(`${animalName}\\s*=\\s*\\{`, "i");
      const animalStart = content.search(animalStartRegex);

      if (animalStart !== -1) {
        // Encontrar o bloco Positions dentro deste animal
        const positionsStart = content.indexOf("Positions", animalStart);
        if (positionsStart !== -1) {
          // Procurar por Male e Female dentro do bloco Positions
          const maleMatch = content
            .substring(positionsStart)
            .match(/Male\s*=\s*(vec4\([^)]+\))/);
          const femaleMatch = content
            .substring(positionsStart)
            .match(/Female\s*=\s*(vec4\([^)]+\))/);

          if (maleMatch && femaleMatch) {
            foundAnimals.push(mapping.key);
            config.animals[mapping.key] = {
              male: vecToInputFormat(maleMatch[1]),
              female: vecToInputFormat(femaleMatch[1]),
            };
          }
        }
      }
    }

    // Determinar tier baseado nos animais encontrados
    if (
      foundAnimals.length === 2 &&
      foundAnimals.includes("pig") &&
      foundAnimals.includes("goat")
    ) {
      config.tier = "prata";
    } else if (
      foundAnimals.length === 4 &&
      foundAnimals.includes("pig") &&
      foundAnimals.includes("goat") &&
      foundAnimals.includes("sheep") &&
      foundAnimals.includes("donkey")
    ) {
      config.tier = "ouro";
    } else if (foundAnimals.length === 7) {
      config.tier = "ultimate";
    } else {
      // Tentar detectar pelo número de animais
      if (foundAnimals.length <= 2) {
        config.tier = "prata";
      } else if (foundAnimals.length <= 4) {
        config.tier = "ouro";
      } else {
        config.tier = "ultimate";
      }
    }

    return config;
  } catch (error) {
    console.error("Erro ao fazer parse do arquivo:", error);
    throw new Error(
      "Erro ao processar o arquivo. Verifique se o formato está correto.",
    );
  }
}

// Função para preencher os campos com os dados do arquivo
function fillFormFields(config) {
  // Preencher campos básicos
  if (config.orgName) {
    document.getElementById("orgName").value = config.orgName;
  }

  if (config.label) {
    document.getElementById("configLabel").value = config.label;
  }

  if (config.workTableCoords) {
    document.getElementById("workTableCoords").value = config.workTableCoords;
  }

  // Definir tier e atualizar campos de animais
  if (config.tier) {
    document.getElementById("nurseryType").value = config.tier;
    updateAnimalFields();
  }

  // Preencher posições dos animais
  if (config.animals) {
    for (const [animalKey, positions] of Object.entries(config.animals)) {
      const animalMapping = {
        pig: { maleId: "pigMale", femaleId: "pigFemale" },
        goat: { maleId: "goatMale", femaleId: "goatFemale" },
        sheep: { maleId: "sheepMale", femaleId: "sheepFemale" },
        donkey: { maleId: "donkeyMale", femaleId: "donkeyFemale" },
        cow: { maleId: "cowMale", femaleId: "cowFemale" },
        chicken: { maleId: "chickenMale", femaleId: "chickenFemale" },
        buffalo: { maleId: "buffaloMale", femaleId: "buffaloFemale" },
      };

      const mapping = animalMapping[animalKey];
      if (mapping) {
        if (positions.male) {
          document.getElementById(mapping.maleId).value = positions.male;
        }
        if (positions.female) {
          document.getElementById(mapping.femaleId).value = positions.female;
        }
      }
    }
  }
}

// Função para carregar arquivo de configuração
function loadConfigFile(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const content = e.target.result;
      const config = parseConfigFile(content);
      fillFormFields(config);

      // Mostrar mensagem de sucesso
      const fileInfo = document.getElementById("fileInfo");
      fileInfo.style.display = "block";
      fileInfo.textContent = `✅ Arquivo "${file.name}" carregado com sucesso! Campos preenchidos.`;
      fileInfo.style.color = "var(--success)";

      // Limpar mensagem após 5 segundos
      setTimeout(() => {
        fileInfo.style.display = "none";
      }, 5000);
    } catch (error) {
      alert("❌ Erro ao processar o arquivo: " + error.message);
      console.error(error);
    }
  };

  reader.onerror = function () {
    alert("❌ Erro ao ler o arquivo. Tente novamente.");
  };

  reader.readAsText(file);
}

// Função para garantir que todos os campos de SpawnPoints sejam editáveis
function ensureSpawnPointsEditable() {
  const animalKeys = [
    "cow",
    "pig",
    "buffalo",
    "chicken",
    "sheep",
    "goat",
    "donkey",
  ];

  animalKeys.forEach((animalKey) => {
    const maxSpawns = animalKey === "donkey" ? 1 : 4;
    for (let i = 1; i <= maxSpawns; i++) {
      const spawnInput = document.getElementById(`${animalKey}Spawn${i}`);
      if (spawnInput) {
        spawnInput.removeAttribute("readonly");
        spawnInput.removeAttribute("disabled");
        spawnInput.style.pointerEvents = "auto";
        spawnInput.style.cursor = "text";
      }
    }
  });
}

// Função para destacar o link ativo na sidebar
function highlightActiveNav() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    const href = item.getAttribute("href");
    if (href === currentPage || (currentPage === "" && href === "index.html")) {
      item.classList.add("active");
    }
  });
}

// Inicializar campos ao carregar a página
window.onload = function () {
  // Destacar link ativo na sidebar
  highlightActiveNav();

  // Verificar se estamos na página de berçário
  if (document.getElementById("nurseryType")) {
    updateAnimalFields();
  }

  // Verificar se estamos na página de organização
  if (document.getElementById("farmName")) {
    // Garantir que os campos de SpawnPoints sejam editáveis
    setTimeout(ensureSpawnPointsEditable, 100);
  }
};

// ========== NAVEGAÇÃO ENTRE PÁGINAS ==========
function showPage(pageId, event) {
  // Esconder todas as páginas
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  // Mostrar página selecionada
  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  // Atualizar navegação
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  if (event) {
    const navItem = event.target.closest(".nav-item");
    if (navItem) {
      navItem.classList.add("active");
    }
  } else {
    // Se não houver event, encontrar o item pela página
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      const href = item.getAttribute("onclick");
      if (href && href.includes(`'${pageId}'`)) {
        item.classList.add("active");
      }
    });
  }

  // Se for a página de organização, garantir que os campos sejam editáveis
  if (pageId === "organization") {
    setTimeout(ensureSpawnPointsEditable, 100);
  }
}

// ========== PÁGINA DE ORGANIZAÇÃO ==========
let generatedOrgConfig = "";

function parseCoordsOrg(coordString, isVec3 = false) {
  const cleaned = coordString.replace(/[{}\s]/g, "");
  const values = cleaned.split(",").map((v) => v.trim());

  if (isVec3) {
    return `vec3(${values[0]}, ${values[1]}, ${values[2]})`;
  } else {
    return `vec4(${values[0]}, ${values[1]}, ${values[2]}, ${values[3]})`;
  }
}

function generateOrgConfig() {
  try {
    const farmName = document.getElementById("farmName").value || "fazenda_110";
    const farmLabel =
      document.getElementById("farmLabel").value || "fazenda_110";
    const pointCenter = parseCoordsOrg(
      document.getElementById("pointCenter").value,
      true,
    );

    const workTableSpawnCoords = parseCoordsOrg(
      document.getElementById("workTableSpawnCoords").value,
      true,
    );
    const workTableHeading = "-39.90"; // Valor fixo
    const workTableServiceCoords = parseCoordsOrg(
      document.getElementById("workTableServiceCoords").value,
      true,
    );

    const animals = [];

    // Cow
    const cowMax = "4"; // Valor fixo
    const cowSpawns = [];
    for (let i = 1; i <= 4; i++) {
      const spawn = document.getElementById(`cowSpawn${i}`).value;
      if (spawn) {
        cowSpawns.push(`                    ${parseCoordsOrg(spawn)}`);
      }
    }
    if (cowSpawns.length > 0) {
      animals.push(`            Cow = {
                Max = ${cowMax},
                SpawnPoints = {
${cowSpawns.join(",\n")},
                }
            }`);
    }

    // Pig
    const pigMax = "4"; // Valor fixo
    const pigSpawns = [];
    for (let i = 1; i <= 4; i++) {
      const spawn = document.getElementById(`pigSpawn${i}`).value;
      if (spawn) {
        pigSpawns.push(`                    ${parseCoordsOrg(spawn)}`);
      }
    }
    if (pigSpawns.length > 0) {
      animals.push(`            Pig = {
                Max = ${pigMax},
                SpawnPoints = {
${pigSpawns.join(",\n")},
                }
            }`);
    }

    // Buffalo
    const buffaloMax = "4"; // Valor fixo
    const buffaloSpawns = [];
    for (let i = 1; i <= 4; i++) {
      const spawn = document.getElementById(`buffaloSpawn${i}`).value;
      if (spawn) {
        buffaloSpawns.push(`                    ${parseCoordsOrg(spawn)}`);
      }
    }
    if (buffaloSpawns.length > 0) {
      animals.push(`            Buffalo = {
                Max = ${buffaloMax},
                SpawnPoints = {
${buffaloSpawns.join(",\n")},
                }
            }`);
    }

    // Chicken
    const chickenMax = "4"; // Valor fixo
    const chickenSpawns = [];
    for (let i = 1; i <= 4; i++) {
      const spawn = document.getElementById(`chickenSpawn${i}`).value;
      if (spawn) {
        chickenSpawns.push(`                    ${parseCoordsOrg(spawn)}`);
      }
    }
    if (chickenSpawns.length > 0) {
      animals.push(`            Chicken = {
                Max = ${chickenMax},
                SpawnPoints = {
${chickenSpawns.join(",\n")},
                }
            }`);
    }

    // Sheep
    const sheepMax = "4"; // Valor fixo
    const sheepSpawns = [];
    for (let i = 1; i <= 4; i++) {
      const spawn = document.getElementById(`sheepSpawn${i}`).value;
      if (spawn) {
        sheepSpawns.push(`                    ${parseCoordsOrg(spawn)}`);
      }
    }
    if (sheepSpawns.length > 0) {
      animals.push(`            Sheep = {
                Max = ${sheepMax},
                SpawnPoints = {
${sheepSpawns.join(",\n")},
                }
            }`);
    }

    // Goat
    const goatMax = "4"; // Valor fixo
    const goatSpawns = [];
    for (let i = 1; i <= 4; i++) {
      const spawn = document.getElementById(`goatSpawn${i}`).value;
      if (spawn) {
        goatSpawns.push(`                    ${parseCoordsOrg(spawn)}`);
      }
    }
    if (goatSpawns.length > 0) {
      animals.push(`            Goat = {
                Max = ${goatMax},
                SpawnPoints = {
${goatSpawns.join(",\n")},
                }
            }`);
    }

    // Donkey (apenas 1 SpawnPoint)
    const donkeyMax = "1"; // Valor fixo
    const donkeySpawn1 = document.getElementById("donkeySpawn1").value;
    if (donkeySpawn1) {
      animals.push(`            Donkey = {
                Max = ${donkeyMax},
                SpawnPoints = {
                    ${parseCoordsOrg(donkeySpawn1)},
                }
            }`);
    }

    if (animals.length === 0) {
      alert("⚠️ Preencha pelo menos um animal com seus SpawnPoints.");
      return;
    }

    generatedOrgConfig = `['${farmName}'] = {
        Config = {
            label = '${farmLabel}',
            Zone = {
                ClearRadius = false,
                DistanteClear = 150,
                PointCenter = ${pointCenter}
            }
        },

        Services = {
            WorkTable = {
                SpawnObject = {
                    Spawn = false,
                    Model = 'p_haybalestack03x',
                    Coords = ${workTableSpawnCoords},
                    Heading = ${workTableHeading}
                },
                GetServiceCoords = ${workTableServiceCoords}
            }
        },

        Animals = {
${animals.join(",\n\n")}
        }
    },`;

    document.getElementById("orgDownloadBtn").disabled = false;
    alert(
      "✅ Configuração gerada com sucesso! Agora você pode baixar o arquivo.",
    );
  } catch (error) {
    alert(
      "❌ Erro ao gerar configuração. Verifique se todos os campos estão preenchidos corretamente.",
    );
    console.error(error);
  }
}

function downloadOrgConfig() {
  if (!generatedOrgConfig) {
    alert("⚠️ Por favor, gere a configuração primeiro.");
    return;
  }

  const blob = new Blob([generatedOrgConfig], {
    type: "text/plain;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  const farmName = document.getElementById("farmName").value || "fazenda_110";
  a.href = url;
  a.download = `organizacao_${farmName}.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Função para fazer parse do arquivo de configuração da organização
function parseOrgConfigFile(content) {
  try {
    const config = {};

    // Extrair nome da fazenda (chave principal)
    const farmMatch = content.match(/\[['"]([^'"]+)['"]\]\s*=/);
    if (farmMatch) {
      config.farmName = farmMatch[1];
    }

    // Extrair Label
    const labelMatch = content.match(/label\s*=\s*['"]([^'"]+)['"]/i);
    if (labelMatch) {
      config.label = labelMatch[1];
    }

    // Extrair PointCenter
    const pointCenterMatch = content.match(/PointCenter\s*=\s*(vec3\([^)]+\))/);
    if (pointCenterMatch) {
      config.pointCenter = vecToInputFormat(pointCenterMatch[1]);
    }

    // Extrair WorkTable Coords
    const workTableCoordsMatch = content.match(/Coords\s*=\s*(vec3\([^)]+\))/);
    if (workTableCoordsMatch) {
      config.workTableSpawnCoords = vecToInputFormat(workTableCoordsMatch[1]);
    }

    // Extrair Heading
    const headingMatch = content.match(/Heading\s*=\s*([-\d.]+)/);
    if (headingMatch) {
      config.workTableHeading = headingMatch[1];
    }

    // Extrair GetServiceCoords
    const serviceCoordsMatch = content.match(
      /GetServiceCoords\s*=\s*(vec3\([^)]+\))/,
    );
    if (serviceCoordsMatch) {
      config.workTableServiceCoords = vecToInputFormat(serviceCoordsMatch[1]);
    }

    // Extrair animais
    config.animals = {};
    const animalNames = [
      "Cow",
      "Pig",
      "Buffalo",
      "Chicken",
      "Sheep",
      "Goat",
      "Donkey",
    ];

    for (const animalName of animalNames) {
      const animalRegex = new RegExp(
        `${animalName}\\s*=\\s*\\{[\\s\\S]*?Max\\s*=\\s*(\\d+)[\\s\\S]*?SpawnPoints\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*\\}`,
        "i",
      );
      const animalMatch = content.match(animalRegex);

      if (animalMatch) {
        const max = animalMatch[1];
        const spawnPointsContent = animalMatch[2];

        // Extrair todos os vec4 do SpawnPoints
        const vec4Regex = /vec4\([^)]+\)/g;
        const spawnPoints = spawnPointsContent.match(vec4Regex) || [];

        config.animals[animalName.toLowerCase()] = {
          max: max,
          spawnPoints: spawnPoints.map((sp) => vecToInputFormat(sp)),
        };
      }
    }

    return config;
  } catch (error) {
    console.error("Erro ao fazer parse do arquivo:", error);
    throw new Error(
      "Erro ao processar o arquivo. Verifique se o formato está correto.",
    );
  }
}

// Função para preencher os campos da organização com os dados do arquivo
function fillOrgFormFields(config) {
  // Função auxiliar para garantir que o campo seja editável
  const setEditableValue = (elementId, value) => {
    const element = document.getElementById(elementId);
    if (element && value) {
      element.value = value;
      element.removeAttribute("readonly");
      element.removeAttribute("disabled");
      element.style.pointerEvents = "auto";
      element.style.cursor = "text";
    }
  };

  if (config.farmName) {
    setEditableValue("farmName", config.farmName);
  }

  if (config.label) {
    setEditableValue("farmLabel", config.label);
  }

  if (config.pointCenter) {
    setEditableValue("pointCenter", config.pointCenter);
  }

  if (config.workTableSpawnCoords) {
    setEditableValue("workTableSpawnCoords", config.workTableSpawnCoords);
  }

  if (config.workTableServiceCoords) {
    setEditableValue("workTableServiceCoords", config.workTableServiceCoords);
  }

  // Preencher animais
  if (config.animals) {
    for (const [animalKey, animalData] of Object.entries(config.animals)) {
      // Preencher SpawnPoints (Max não é mais editável)
      if (animalData.spawnPoints) {
        const maxSpawns = animalKey === "donkey" ? 1 : 4;
        for (
          let i = 0;
          i < Math.min(animalData.spawnPoints.length, maxSpawns);
          i++
        ) {
          setEditableValue(
            `${animalKey}Spawn${i + 1}`,
            animalData.spawnPoints[i],
          );
        }
      }
    }
  }
}

// Função para carregar arquivo de configuração da organização
function loadOrgConfigFile(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const content = e.target.result;
      const config = parseOrgConfigFile(content);
      fillOrgFormFields(config);

      // Mostrar mensagem de sucesso
      const fileInfo = document.getElementById("orgFileInfo");
      fileInfo.style.display = "block";
      fileInfo.textContent = `✅ Arquivo "${file.name}" carregado com sucesso! Campos preenchidos.`;
      fileInfo.style.color = "var(--success)";

      // Limpar mensagem após 5 segundos
      setTimeout(() => {
        fileInfo.style.display = "none";
      }, 5000);
    } catch (error) {
      alert("❌ Erro ao processar o arquivo: " + error.message);
      console.error(error);
    }
  };

  reader.onerror = function () {
    alert("❌ Erro ao ler o arquivo. Tente novamente.");
  };

  reader.readAsText(file);
}

// ========== PÁGINA DE ESTÁBULO ==========
let generatedStableConfig = "";
let trainingCount = 0;

// Adicionar Nova Configuração de Treinamento
function addTrainingConfig(data = null) {
  trainingCount++;
  const id = trainingCount;
  const container = document.getElementById("trainingsContainer");

  const div = document.createElement("div");
  div.className = "training-card";
  div.style =
    "background: rgba(22, 27, 34, 0.4); border: 1px solid rgba(88, 166, 255, 0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;";
  div.id = `training-${id}`;

  div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(88, 166, 255, 0.2);">
            <h3 style="margin: 0; color: var(--accent);">Treinamento #${id}</h3>
            <button class="btn-secondary btn-compact" onclick="removeTraining(${id})" style="background: #d32f2f;">Remover</button>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Tipo de Treinamento</label>
                <select id="trainingType-${id}">
                    <option value="speed">Speed (Velocidade)</option>
                    <option value="handling">Handling (Manuseio)</option>
                    <option value="acceleration">Acceleration (Aceleração)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Start (Início - vec4)</label>
                <input type="text" id="trainingStart-${id}" placeholder="{...}">
            </div>
        </div>

        <h4 style="color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 0.9rem; text-transform: uppercase;">Camera Preview</h4>
        <div class="spawn-points">
            <div class="form-group">
                <label>Coords (vec3)</label>
                <input type="text" id="camCoords-${id}" placeholder="{...}">
            </div>
            <div class="form-group">
                <label>Rot (vec3)</label>
                <input type="text" id="camRot-${id}" placeholder="{-7.000, 0.000, 23.60}">
            </div>
        </div>

        <h4 style="color: var(--text-secondary); margin: 1rem 0 0.5rem; font-size: 0.9rem; text-transform: uppercase;">Checkpoints</h4>
        <div id="checkpointsList-${id}">
            <!-- Checkpoints dinâmicos -->
        </div>
        <button class="btn-secondary" onclick="addCheckpointForTraining(${id})" style="margin-top: 0.5rem; width: auto; padding: 0.5rem 1rem; font-size: 0.8rem;">+ Adicionar Checkpoint</button>
    `;

  container.appendChild(div);

  // Se tiver dados para preencher
  if (data) {
    if (data.type)
      document.getElementById(`trainingType-${id}`).value = data.type;
    if (data.start)
      document.getElementById(`trainingStart-${id}`).value = data.start;
    if (data.camCoords)
      document.getElementById(`camCoords-${id}`).value = data.camCoords;
    if (data.camRot)
      document.getElementById(`camRot-${id}`).value = data.camRot;

    if (data.checkpoints && data.checkpoints.length > 0) {
      data.checkpoints.forEach((chk) => addCheckpointForTraining(id, chk));
    }
  } else {
    // Inicializar com 7 checkpoints vazios por padrão
    for (let i = 0; i < 7; i++) addCheckpointForTraining(id);
  }
}

function removeTraining(id) {
  document.getElementById(`training-${id}`).remove();
}

// Adicionar checkpoint específico para um treinamento
function addCheckpointForTraining(trainingId, value = "") {
  const list = document.getElementById(`checkpointsList-${trainingId}`);
  const count = list.children.length + 1;

  const div = document.createElement("div");
  div.className = "form-group";
  div.style = "display: flex; gap: 0.5rem; align-items: flex-end;";
  div.innerHTML = `
        <div style="flex: 1;">
            <label style="font-size: 0.75rem; margin-bottom: 0.25rem;">CP ${count} (vec3)</label>
            <input type="text" class="checkpoint-input" value="${value}" placeholder="{...}">
        </div>
        <button class="btn-secondary btn-compact" onclick="this.parentElement.remove()" style="margin-bottom: 2px; background: #d32f2f;" title="Remover">🗑️</button>
    `;
  list.appendChild(div);
}

function generateStableConfig() {
  try {
    const id = document.getElementById("stableId").value || "annesburg";
    const name =
      document.getElementById("stableName").value || "Treinamento Annesburg";
    const location = parseCoordsOrg(
      document.getElementById("stableLocation").value,
    );

    const previewHorse = parseCoordsOrg(
      document.getElementById("previewHorse").value,
    );
    const previewMyHorse = parseCoordsOrg(
      document.getElementById("previewMyHorse").value,
    );
    const equipMyHorse = parseCoordsOrg(
      document.getElementById("equipMyHorse").value,
    );

    const previewWagon = parseCoordsOrg(
      document.getElementById("previewWagon").value,
    );
    const spawnWagon = parseCoordsOrg(
      document.getElementById("spawnWagon").value,
    );

    const storeSaddle = parseCoordsOrg(
      document.getElementById("storeSaddle").value,
    );

    // Inside Stable
    const insideStable = [];
    for (let i = 1; i <= 4; i++) {
      const val = document.getElementById(`insideStable${i}`).value;
      if (val) insideStable.push(`            ${parseCoordsOrg(val, true)}`);
    }

    // Training Zone (Apenas uma zona de treinamento geral, mas múltiplos circuitos)
    const trainingJob = document.getElementById("trainingJob").value;
    const insideTraining = [];
    for (let i = 1; i <= 4; i++) {
      const val = document.getElementById(`insideTraining${i}`).value;
      if (val) insideTraining.push(`            ${parseCoordsOrg(val, true)}`);
    }

    // Processar Treinamentos (Dynamic)
    const trainingCards = document.querySelectorAll(".training-card");
    const trainingConfigs = [];

    trainingCards.forEach((card) => {
      const tId = card.id.split("-")[1];
      const type = document.getElementById(`trainingType-${tId}`).value;
      const start = parseCoordsOrg(
        document.getElementById(`trainingStart-${tId}`).value,
      );
      const camCoords = parseCoordsOrg(
        document.getElementById(`camCoords-${tId}`).value,
        true,
      );
      const camRot = parseCoordsOrg(
        document.getElementById(`camRot-${tId}`).value,
        true,
      );

      const cps = [];
      card.querySelectorAll(".checkpoint-input").forEach((input) => {
        if (input.value)
          cps.push(`      { coords = ${parseCoordsOrg(input.value, true)} }`);
      });

      trainingConfigs.push(`
    -- Configuração do Treinamento (${type})
    {
        type = "${type}",
        start = ${start},
        camPreview = {
            {
                coords = ${camCoords},
                rot = ${camRot},
            },
        },
        props = {}, 
        checkpoints = {
${cps.join(",\n")}
        }
    }`);
    });

    // Construção da String Final
    generatedStableConfig = `
    {
        id = "${id}", 
        name = "${name}",
        location = ${location},
        pedModel = \`u_m_m_bwmstablehand_01\`,
        blip = \`blip_shop_horse\`,                                                
        disableHorseMenu = false,                                                
        disableWagonMenu = false,                                                
        horsesAvailable = { },
        canBuyHorseComponents = true,                                            
        previewHorse = ${previewHorse},            
        previewMyHorse = ${previewMyHorse},          
        equipMyHorse = ${equipMyHorse},            
        wagonsAvailable = {},                                                    
        previewWagon = ${previewWagon},            
        spawnWagon = ${spawnWagon},              
        storeSaddle = ${storeSaddle},
        inside = {                                                               
${insideStable.join(",\n")}
        },
        needInstance = true
    },

    -- Configuração da Zona de Treinamento
    {
        inside = {
${insideTraining.join(",\n")}
        },
        blip = \`blip_horse_owned_bonding_4\`,
        jobs = { "${trainingJob}" },
        activities = { 'speed', 'handling', 'acceleration' }
    },
${trainingConfigs.join(",\n")}
`;

    document.getElementById("stableDownloadBtn").disabled = false;
    alert("✅ Configuração de Estábulo gerada com sucesso!");
  } catch (error) {
    alert("❌ Erro ao gerar configuração. Verifique os campos.");
    console.error(error);
  }
}

function downloadStableConfig() {
  if (!generatedStableConfig) {
    alert("⚠️ Gere a configuração primeiro.");
    return;
  }
  const blob = new Blob([generatedStableConfig], {
    type: "text/plain;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  const id = document.getElementById("stableId").value || "stable";
  a.href = url;
  a.download = `estabulo_${id}.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Parse Stable Config
function loadStableConfigFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const content = e.target.result;

      // Regex Helpers
      const getVal = (regex) => {
        const match = content.match(regex);
        return match ? match[1] : "";
      };
      const getVec = (regex) => {
        const match = content.match(regex);
        return match ? vecToInputFormat(match[1] || match[0]) : "";
      };

      // Basic Info
      const id = getVal(/id\s*=\s*"([^"]+)"/);
      const name = getVal(/name\s*=\s*"([^"]+)"/);
      const location = getVec(/location\s*=\s*(vec4\([^)]+\))/);

      if (id) document.getElementById("stableId").value = id;
      if (name) document.getElementById("stableName").value = name;
      if (location) document.getElementById("stableLocation").value = location;

      // Visualização e Outros
      const previewHorse = getVec(/previewHorse\s*=\s*(vec4\([^)]+\))/);
      const previewMyHorse = getVec(/previewMyHorse\s*=\s*(vec4\([^)]+\))/);
      const equipMyHorse = getVec(/equipMyHorse\s*=\s*(vec4\([^)]+\))/);

      if (previewHorse)
        document.getElementById("previewHorse").value = previewHorse;
      if (previewMyHorse)
        document.getElementById("previewMyHorse").value = previewMyHorse;
      if (equipMyHorse)
        document.getElementById("equipMyHorse").value = equipMyHorse;

      const previewWagon = getVec(/previewWagon\s*=\s*(vec4\([^)]+\))/);
      const spawnWagon = getVec(/spawnWagon\s*=\s*(vec4\([^)]+\))/);
      const storeSaddle = getVec(/storeSaddle\s*=\s*(vec4\([^)]+\))/);

      if (previewWagon)
        document.getElementById("previewWagon").value = previewWagon;
      if (spawnWagon) document.getElementById("spawnWagon").value = spawnWagon;
      if (storeSaddle)
        document.getElementById("storeSaddle").value = storeSaddle;

      // Insides
      const insideMatches = [...content.matchAll(/inside\s*=\s*\{([^}]+)\}/g)];
      if (insideMatches.length > 0) {
        const stableInsideVecs = insideMatches[0][1].match(/vec3\([^)]+\)/g);
        if (stableInsideVecs) {
          stableInsideVecs.forEach((vec, i) => {
            if (i < 4)
              document.getElementById(`insideStable${i + 1}`).value =
                vecToInputFormat(vec);
          });
        }
      }
      if (insideMatches.length > 1) {
        const trainingInsideVecs = insideMatches[1][1].match(/vec3\([^)]+\)/g);
        if (trainingInsideVecs) {
          trainingInsideVecs.forEach((vec, i) => {
            if (i < 4)
              document.getElementById(`insideTraining${i + 1}`).value =
                vecToInputFormat(vec);
          });
        }
      }

      const job = getVal(/jobs\s*=\s*\{\s*"([^"]+)"\s*\}/);
      if (job) document.getElementById("trainingJob").value = job;

      // Parse Multiple Trainings
      // Cada treinamento tem um type, start, camPreview, checkpoints...
      // Vamos dar split no conteúdo pelos blocos que parecem configs de treino

      // Limpar treinamentos atuais
      document.getElementById("trainingsContainer").innerHTML = "";
      trainingCount = 0;

      // Estratégia: Encontrar todos os blocos { type = "..." ... }
      // Regex global para capturar esses blocos pode ser complexo.
      // Vamos tentar matchAll com algo que identifique o inicio do bloco.

      const trainingRegex =
        /type\s*=\s*"([^"]+)"[\s\S]*?start\s*=\s*(vec4\([^)]+\))[\s\S]*?checkpoints\s*=\s*\{([\s\S]*?)\}/g;
      const trainingMatches = [...content.matchAll(trainingRegex)];

      if (trainingMatches.length > 0) {
        trainingMatches.forEach((match) => {
          const type = match[1];
          const startRaw = match[2];
          const checkpointsBlock = match[3];

          // Tentar achar camPreview dentro desse match ou perto?
          // O regex acima pega tudo até checkpoints, então camPreview deve estar no meio.
          // Vamos extrair do texto completo do match: match[0]

          const blockText = match[0];
          const camBlock = blockText.match(/camPreview\s*=\s*\{[\s\S]*?\}/);
          let cCoords = "",
            cRot = "";

          if (camBlock) {
            const cc = camBlock[0].match(/coords\s*=\s*(vec3\([^)]+\))/);
            const cr = camBlock[0].match(/rot\s*=\s*(vec3\([^)]+\))/);
            if (cc) cCoords = vecToInputFormat(cc[1]);
            if (cr) cRot = vecToInputFormat(cr[1]);
          }

          const cpVecs = checkpointsBlock.match(/vec3\([^)]+\)/g) || [];
          const checkpoints = cpVecs.map((v) => vecToInputFormat(v));

          addTrainingConfig({
            type: type,
            start: vecToInputFormat(startRaw),
            camCoords: cCoords,
            camRot: cRot,
            checkpoints: checkpoints,
          });
        });
      } else {
        // Se não achou nenhum, adiciona um vazio
        addTrainingConfig();
      }

      // Sucesso
      const fileInfo = document.getElementById("stableFileInfo");
      fileInfo.style.display = "block";
      fileInfo.textContent = `✅ Arquivo "${file.name}" carregado!`;
      setTimeout(() => {
        fileInfo.style.display = "none";
      }, 5000);
    } catch (error) {
      alert("❌ Erro no parse: " + error.message);
      console.error(error);
    }
  };
  reader.readAsText(file);
}

// Inicializar com um treinamento se estiver na página
if (document.getElementById("trainingsContainer")) {
  addTrainingConfig();
}

// ==============================
// CRAFTS SYSTEM
// ==============================

let craftCount = 0;
let generatedCraftConfig = "";

function addCraftConfig(data = null) {
  craftCount++;
  const id = craftCount;
  const container = document.getElementById("craftsContainer");

  const div = document.createElement("div");
  div.className = "craft-card";
  div.style =
    "background: rgba(22, 27, 34, 0.4); border: 1px solid rgba(88, 166, 255, 0.1); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;";
  div.id = `craft-${id}`;

  div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(88, 166, 255, 0.2);">
            <h3 style="margin: 0; color: var(--accent);">Craft #${id}</h3>
            <button class="btn-secondary btn-compact" onclick="removeCraft(${id})" style="background: #d32f2f;">Remover</button>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Spawn do Item</label>
                <input type="text" id="craftSpawn-${id}" placeholder="item_name">
            </div>
            <div class="form-group">
                <label>Nome do Item</label>
                <input type="text" id="craftName-${id}" placeholder="Nome Visual">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Preço de Venda</label>
                <input type="number" id="craftPrice-${id}" placeholder="500" value="500">
            </div>
            <div class="form-group">
                <label>Experiência (EXP)</label>
                <input type="number" id="craftExp-${id}" placeholder="10" value="10">
            </div>
            <div class="form-group">
                <label>Tempo de Craft (segundos)</label>
                <input type="number" id="craftTime-${id}" placeholder="10" value="10">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Tipo de Moeda</label>
                <select id="craftType-${id}">
                    <option value="0">0 - Dinheiro</option>
                    <option value="1">1 - Ouro</option>
                </select>
            </div>
            <div class="form-group">
                <label>É Arma?</label>
                <select id="craftIsWeapon-${id}">
                    <option value="false">false - Item</option>
                    <option value="true">true - Arma</option>
                </select>
            </div>
            <div class="form-group">
                <label>Quantidade Produzida</label>
                <input type="number" id="craftQuantity-${id}" placeholder="12" value="12">
            </div>
        </div>

        <h4 style="color: var(--text-secondary); margin: 1rem 0 0.5rem; font-size: 0.9rem; text-transform: uppercase;">Ingredientes</h4>
        <div id="ingredientsList-${id}">
            <!-- Ingredientes dinâmicos -->
        </div>
        <button class="btn-secondary" onclick="addIngredientForCraft(${id})" style="margin-top: 0.5rem; width: auto; padding: 0.5rem 1rem; font-size: 0.8rem;">+ Adicionar Ingrediente</button>
    `;

  container.appendChild(div);

  // Se tiver dados para preencher
  if (data) {
    if (data.spawn)
      document.getElementById(`craftSpawn-${id}`).value = data.spawn;
    if (data.name) document.getElementById(`craftName-${id}`).value = data.name;
    if (data.price)
      document.getElementById(`craftPrice-${id}`).value = data.price;
    if (data.exp) document.getElementById(`craftExp-${id}`).value = data.exp;
    if (data.craftTime)
      document.getElementById(`craftTime-${id}`).value = data.craftTime;
    if (data.type !== undefined)
      document.getElementById(`craftType-${id}`).value = data.type;
    if (data.isWeapon !== undefined)
      document.getElementById(`craftIsWeapon-${id}`).value = data.isWeapon;
    if (data.quantity)
      document.getElementById(`craftQuantity-${id}`).value = data.quantity;

    if (data.ingredients && data.ingredients.length > 0) {
      data.ingredients.forEach((ing) => addIngredientForCraft(id, ing));
    }
  } else {
    // Inicializar com 4 ingredientes vazios por padrão
    for (let i = 0; i < 4; i++) addIngredientForCraft(id);
  }
}

function removeCraft(id) {
  document.getElementById(`craft-${id}`).remove();
}

let ingredientCounters = {};

function addIngredientForCraft(craftId, data = null) {
  if (!ingredientCounters[craftId]) ingredientCounters[craftId] = 0;
  ingredientCounters[craftId]++;

  const ingId = ingredientCounters[craftId];
  const container = document.getElementById(`ingredientsList-${craftId}`);

  const div = document.createElement("div");
  div.className = "form-row";
  div.style =
    "margin-bottom: 0.5rem; padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px;";
  div.id = `ingredient-${craftId}-${ingId}`;

  div.innerHTML = `
        <div class="form-group" style="flex: 1;">
            <label>Spawn do Ingrediente</label>
            <input type="text" class="ingredient-spawn" id="ingSpawn-${craftId}-${ingId}" placeholder="ingredient_spawn" value="${data && data.spawn ? data.spawn : ""}">
        </div>
        <div class="form-group" style="flex: 1;">
            <label>Nome do Ingrediente</label>
            <input type="text" class="ingredient-name" id="ingName-${craftId}-${ingId}" placeholder="Nome do Ingrediente" value="${data && data.name ? data.name : ""}">
        </div>
        <div class="form-group" style="flex: 0.5;">
            <label>Quantidade</label>
            <input type="number" class="ingredient-quantity" id="ingQty-${craftId}-${ingId}" placeholder="2" value="${data && data.quantity ? data.quantity : 2}">
        </div>
        <div class="form-group" style="flex: 0;">
            <label style="visibility: hidden;">-</label>
            <button class="btn-secondary btn-compact" onclick="removeIngredient(${craftId}, ${ingId})" style="background: #d32f2f; padding: 0.5rem;">X</button>
        </div>
    `;

  container.appendChild(div);
}

function removeIngredient(craftId, ingId) {
  const elem = document.getElementById(`ingredient-${craftId}-${ingId}`);
  if (elem) elem.remove();
}

function generateCraftConfig() {
  try {
    const craftCards = document.querySelectorAll(".craft-card");
    if (craftCards.length === 0) {
      alert("⚠️ Adicione pelo menos um craft antes de gerar.");
      return;
    }

    const craftConfigs = [];

    craftCards.forEach((card) => {
      const cId = card.id.split("-")[1];
      const spawn =
        document.getElementById(`craftSpawn-${cId}`).value || "    ";
      const name = document.getElementById(`craftName-${cId}`).value || "    ";
      const price = document.getElementById(`craftPrice-${cId}`).value || "500";
      const exp = document.getElementById(`craftExp-${cId}`).value || "10";
      const craftTime =
        document.getElementById(`craftTime-${cId}`).value || "10";
      const type = document.getElementById(`craftType-${cId}`).value || "0";
      const isWeapon =
        document.getElementById(`craftIsWeapon-${cId}`).value || "false";
      const quantity =
        document.getElementById(`craftQuantity-${cId}`).value || "12";

      // Processar ingredientes
      const ingredientsList = card.querySelectorAll(
        `#ingredientsList-${cId} .form-row`,
      );
      const ingredients = [];

      ingredientsList.forEach((ingRow) => {
        const ingId = ingRow.id.split("-")[2];
        const ingSpawnElem = document.getElementById(
          `ingSpawn-${cId}-${ingId}`,
        );
        const ingNameElem = document.getElementById(`ingName-${cId}-${ingId}`);
        const ingQtyElem = document.getElementById(`ingQty-${cId}-${ingId}`);

        if (ingSpawnElem && ingNameElem && ingQtyElem) {
          const ingSpawn = ingSpawnElem.value || "    ";
          const ingName = ingNameElem.value || "    ";
          const ingQty = ingQtyElem.value || "2";

          ingredients.push(
            `                ['${ingSpawn}'] = { name = '${ingName}', quantity = ${ingQty} }`,
          );
        }
      });

      const ingredientsStr =
        ingredients.length > 0
          ? ingredients.join(",\n")
          : "                ['    '] = { name = '    ', quantity = 2 }";

      craftConfigs.push(`        ['${spawn}'] = {                    -- Spawn do Item
            name = '${name}',              -- Nome do Item
            price = ${price},               -- Preço de Venda
            exp = ${exp},                  -- Experiência que vai receber após a produção
            craftTime = ${craftTime},            -- Tempo de produção em segundos
            type = ${type},                  -- 0 = dinheiro, 1 = ouro
            isWeapon = ${isWeapon},          -- true = arma, false = item
            quantidade = ${quantity},           -- Quantidade de itens que será produzido
            ingredients = {
${ingredientsStr}
            }
        }`);
    });

    generatedCraftConfig = craftConfigs.join(",\n\n") + ",\n";

    document.getElementById("craftDownloadBtn").disabled = false;
    alert("✅ Configuração de Crafts gerada com sucesso!");
  } catch (error) {
    alert("❌ Erro ao gerar configuração. Verifique os campos.");
    console.error(error);
  }
}

function downloadCraftConfig() {
  if (!generatedCraftConfig) {
    alert("⚠️ Gere a configuração primeiro.");
    return;
  }
  const blob = new Blob([generatedCraftConfig], {
    type: "text/plain;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `crafts_config.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function loadCraftConfigFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Limpar crafts existentes
  document.getElementById("craftsContainer").innerHTML = "";
  craftCount = 0;
  ingredientCounters = {};

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const content = e.target.result;

      // Regex para extrair cada craft
      const craftRegex =
        /\['([^']+)'\]\s*=\s*\{[^}]*name\s*=\s*'([^']*)'[^}]*price\s*=\s*(\d+)[^}]*exp\s*=\s*(\d+)[^}]*craftTime\s*=\s*(\d+)[^}]*type\s*=\s*(\d+)[^}]*isWeapon\s*=\s*(\w+)[^}]*quantidade\s*=\s*(\d+)[^}]*ingredients\s*=\s*\{([\s\S]*?)\s*\}\s*\}/g;

      let match;
      let craftsFound = 0;

      while ((match = craftRegex.exec(content)) !== null) {
        craftsFound++;
        const spawn = match[1];
        const name = match[2];
        const price = match[3];
        const exp = match[4];
        const craftTime = match[5];
        const type = match[6];
        const isWeapon = match[7];
        const quantity = match[8];
        const ingredientsBlock = match[9];

        // Extrair ingredientes
        const ingredients = [];
        const ingRegex =
          /\['([^']+)'\]\s*=\s*\{\s*name\s*=\s*'([^']*)',\s*quantity\s*=\s*(\d+)\s*\}/g;
        let ingMatch;

        while ((ingMatch = ingRegex.exec(ingredientsBlock)) !== null) {
          ingredients.push({
            spawn: ingMatch[1],
            name: ingMatch[2],
            quantity: ingMatch[3],
          });
        }

        addCraftConfig({
          spawn: spawn,
          name: name,
          price: price,
          exp: exp,
          craftTime: craftTime,
          type: type,
          isWeapon: isWeapon,
          quantity: quantity,
          ingredients: ingredients,
        });
      }

      if (craftsFound === 0) {
        addCraftConfig();
        alert(
          "⚠️ Nenhum craft válido encontrado no arquivo. Um craft vazio foi adicionado.",
        );
      } else {
        const fileInfo = document.getElementById("craftFileInfo");
        fileInfo.style.display = "block";
        fileInfo.textContent = `✅ ${craftsFound} craft(s) carregado(s) do arquivo "${file.name}"!`;
        setTimeout(() => {
          fileInfo.style.display = "none";
        }, 5000);
      }
    } catch (error) {
      alert("❌ Erro ao processar arquivo: " + error.message);
      console.error(error);
      addCraftConfig();
    }
  };
  reader.readAsText(file);
}

// Inicializar com um craft se estiver na página
if (document.getElementById("craftsContainer")) {
  addCraftConfig();
}
