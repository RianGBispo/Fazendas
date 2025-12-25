let generatedConfig = '';

// Definir animais por tier
const animalsByTier = {
    prata: ['pig', 'goat'],
    ouro: ['pig', 'goat', 'sheep', 'donkey'],
    ultimate: ['pig', 'goat', 'sheep', 'donkey', 'cow', 'chicken', 'buffalo']
};

function updateAnimalFields() {
    const tier = document.getElementById('nurseryType').value;
    const allAnimals = ['pig', 'goat', 'sheep', 'donkey', 'cow', 'chicken', 'buffalo'];
    const activeAnimals = animalsByTier[tier];

    allAnimals.forEach(animal => {
        const card = document.getElementById(`animal-${animal}`);
        if (activeAnimals.includes(animal)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function parseCoords(coordString, isVec3 = false) {
    const cleaned = coordString.replace(/[{}\s]/g, '');
    const values = cleaned.split(',').map(v => v.trim());

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
        const orgName = document.getElementById('orgName').value || 'fazenda_27';
        const configLabel = document.getElementById('configLabel').value || 'fazenda_27';
        const tier = document.getElementById('nurseryType').value;

        const workTableCoords = parseCoords(document.getElementById('workTableCoords').value, true);
        const workTableHeading = '40.433';

        const activeAnimals = animalsByTier[tier];
        const animalConfigs = [];

        // Definição dos animais
        const animalDefinitions = {
            pig: { name: 'Pig', item: 'LibidgelSuino', maleId: 'pigMale', femaleId: 'pigFemale' },
            goat: { name: 'Goat', item: 'LibidgelCaprino', maleId: 'goatMale', femaleId: 'goatFemale' },
            sheep: { name: 'Sheep', item: 'LibidgelOvino', maleId: 'sheepMale', femaleId: 'sheepFemale' },
            donkey: { name: 'Donkey', item: 'LibidgelAsneiro', maleId: 'donkeyMale', femaleId: 'donkeyFemale' },
            cow: { name: 'Cow', item: 'LibidgelBovino', maleId: 'cowMale', femaleId: 'cowFemale' },
            chicken: { name: 'Chicken', item: 'LibidgelAviario', maleId: 'chickenMale', femaleId: 'chickenFemale' },
            buffalo: { name: 'Buffalo', item: 'LibidgelBufalino', maleId: 'buffaloMale', femaleId: 'buffaloFemale' }
        };

        // Gerar configs apenas dos animais ativos
        activeAnimals.forEach(animalKey => {
            const def = animalDefinitions[animalKey];
            const config = generateAnimalConfig(def.name, def.item, def.maleId, def.femaleId);
            if (config) {
                animalConfigs.push(config);
            }
        });

        if (animalConfigs.length === 0) {
            alert('⚠️ Preencha pelo menos as posições dos animais do tipo selecionado.');
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
${animalConfigs.join(',\n\n')}
        }
    },`;

        document.getElementById('downloadBtn').disabled = false;
        alert('✅ Configuração gerada com sucesso! Agora você pode baixar o arquivo.');
    } catch (error) {
        alert('❌ Erro ao gerar configuração. Verifique se todos os campos estão preenchidos corretamente.');
        console.error(error);
    }
}

function downloadConfig() {
    if (!generatedConfig) {
        alert('⚠️ Por favor, gere a configuração primeiro.');
        return;
    }

    const blob = new Blob([generatedConfig], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const orgName = document.getElementById('orgName').value || 'fazenda_27';
    const tier = document.getElementById('nurseryType').value;
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
    const cleaned = vecString.replace(/vec[34]\(/, '').replace(/\)$/, '');
    const values = cleaned.split(',').map(v => v.trim());
    return `{${values.join(', ')}}`;
}

// Função para extrair coordenadas de uma string vec3 ou vec4
function extractCoords(vecString) {
    const match = vecString.match(/vec[34]\(([^)]+)\)/);
    if (match) {
        return match[1].split(',').map(v => v.trim()).join(', ');
    }
    return '';
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
            'Pig': { key: 'pig', maleId: 'pigMale', femaleId: 'pigFemale' },
            'Goat': { key: 'goat', maleId: 'goatMale', femaleId: 'goatFemale' },
            'Sheep': { key: 'sheep', maleId: 'sheepMale', femaleId: 'sheepFemale' },
            'Donkey': { key: 'donkey', maleId: 'donkeyMale', femaleId: 'donkeyFemale' },
            'Cow': { key: 'cow', maleId: 'cowMale', femaleId: 'cowFemale' },
            'Chicken': { key: 'chicken', maleId: 'chickenMale', femaleId: 'chickenFemale' },
            'Buffalo': { key: 'buffalo', maleId: 'buffaloMale', femaleId: 'buffaloFemale' }
        };
        
        // Extrair posições dos animais
        config.animals = {};
        const foundAnimals = [];
        
        for (const [animalName, mapping] of Object.entries(animalMapping)) {
            // Buscar bloco do animal usando uma abordagem mais flexível
            // Procura por: AnimalName = { ... Positions = { { Male = vec4(...), Female = vec4(...) } } }
            // Primeiro, encontrar o início do bloco do animal
            const animalStartRegex = new RegExp(`${animalName}\\s*=\\s*\\{`, 'i');
            const animalStart = content.search(animalStartRegex);
            
            if (animalStart !== -1) {
                // Encontrar o bloco Positions dentro deste animal
                const positionsStart = content.indexOf('Positions', animalStart);
                if (positionsStart !== -1) {
                    // Procurar por Male e Female dentro do bloco Positions
                    const maleMatch = content.substring(positionsStart).match(/Male\s*=\s*(vec4\([^)]+\))/);
                    const femaleMatch = content.substring(positionsStart).match(/Female\s*=\s*(vec4\([^)]+\))/);
                    
                    if (maleMatch && femaleMatch) {
                        foundAnimals.push(mapping.key);
                        config.animals[mapping.key] = {
                            male: vecToInputFormat(maleMatch[1]),
                            female: vecToInputFormat(femaleMatch[1])
                        };
                    }
                }
            }
        }
        
        // Determinar tier baseado nos animais encontrados
        if (foundAnimals.length === 2 && foundAnimals.includes('pig') && foundAnimals.includes('goat')) {
            config.tier = 'prata';
        } else if (foundAnimals.length === 4 && foundAnimals.includes('pig') && foundAnimals.includes('goat') && 
                   foundAnimals.includes('sheep') && foundAnimals.includes('donkey')) {
            config.tier = 'ouro';
        } else if (foundAnimals.length === 7) {
            config.tier = 'ultimate';
        } else {
            // Tentar detectar pelo número de animais
            if (foundAnimals.length <= 2) {
                config.tier = 'prata';
            } else if (foundAnimals.length <= 4) {
                config.tier = 'ouro';
            } else {
                config.tier = 'ultimate';
            }
        }
        
        return config;
    } catch (error) {
        console.error('Erro ao fazer parse do arquivo:', error);
        throw new Error('Erro ao processar o arquivo. Verifique se o formato está correto.');
    }
}

// Função para preencher os campos com os dados do arquivo
function fillFormFields(config) {
    // Preencher campos básicos
    if (config.orgName) {
        document.getElementById('orgName').value = config.orgName;
    }
    
    if (config.label) {
        document.getElementById('configLabel').value = config.label;
    }
    
    if (config.workTableCoords) {
        document.getElementById('workTableCoords').value = config.workTableCoords;
    }
    
    // Definir tier e atualizar campos de animais
    if (config.tier) {
        document.getElementById('nurseryType').value = config.tier;
        updateAnimalFields();
    }
    
    // Preencher posições dos animais
    if (config.animals) {
        for (const [animalKey, positions] of Object.entries(config.animals)) {
            const animalMapping = {
                'pig': { maleId: 'pigMale', femaleId: 'pigFemale' },
                'goat': { maleId: 'goatMale', femaleId: 'goatFemale' },
                'sheep': { maleId: 'sheepMale', femaleId: 'sheepFemale' },
                'donkey': { maleId: 'donkeyMale', femaleId: 'donkeyFemale' },
                'cow': { maleId: 'cowMale', femaleId: 'cowFemale' },
                'chicken': { maleId: 'chickenMale', femaleId: 'chickenFemale' },
                'buffalo': { maleId: 'buffaloMale', femaleId: 'buffaloFemale' }
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
    
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            const config = parseConfigFile(content);
            fillFormFields(config);
            
            // Mostrar mensagem de sucesso
            const fileInfo = document.getElementById('fileInfo');
            fileInfo.style.display = 'block';
            fileInfo.textContent = `✅ Arquivo "${file.name}" carregado com sucesso! Campos preenchidos.`;
            fileInfo.style.color = 'var(--success)';
            
            // Limpar mensagem após 5 segundos
            setTimeout(() => {
                fileInfo.style.display = 'none';
            }, 5000);
        } catch (error) {
            alert('❌ Erro ao processar o arquivo: ' + error.message);
            console.error(error);
        }
    };
    
    reader.onerror = function() {
        alert('❌ Erro ao ler o arquivo. Tente novamente.');
    };
    
    reader.readAsText(file);
}

// Inicializar campos ao carregar a página
window.onload = function () {
    updateAnimalFields();
};

