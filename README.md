# 🌾 Configurador de Fazendas & Estábulos

Este projeto fornece uma interface web moderna e intuitiva para gerar arquivos de configuração (Lua) para scripts de gerenciamento de fazendas, animais e estábulos em servidores FiveM (RedM/Vorp/QBR/etc).

## 🚀 Funcionalidades

O projeto é dividido em três módulos principais de configuração:

### 1. 🐣 Berçário (Nursery)
Configuração destinada ao gerenciamento de animais jovens e crescimento.
- Definição de coordenadas de spawn.
- Configuração de tipos de animais permitidos.
- Ajustes de tempo de crescimento e alimentação.

### 2. 🏢 Organização (Organization)
Configuração geral para a gestão da fazenda ou organização.
- Definição de locais de blips e NPCs.
- Configuração de polyzones (zonas de interação).
- Permissões de trabalho (Jobs).

### 3. 🐎 Estábulo (Stable)
Módulo completo para criação e gestão de estábulos e zonas de treinamento.
- **Informações Básicas**: ID, Nome e Localização do estábulo.
- **Visualização**: Coordenadas para preview de cavalos e carroças.
- **Interiores**: Definição de zonas internas (Inside) para estábulo e treinamento.
- **Treinamento**: Criação dinâmica de múltiplos circuitos de treinamento:
    - Tipos: *Speed*, *Handling*, *Acceleration*.
    - Visualização de câmera (CamPreview).
    - **Checkpoints Dinâmicos**: Adicione e remova checkpoints para criar circuitos personalizados.

## 🛠️ Como Usar

1. **Abrir a Ferramenta**:
   - Basta abrir o arquivo `stables.html`, `index.html` ou `organization.html` em seu navegador web preferido (Chrome, Firefox, Edge).
   - Não é necessário instalação de servidor web (funciona localmente).

2. **Preencher os Dados**:
   - Utilize os campos do formulário para inserir as coordenadas (`vec3`, `vec4`), nomes e IDs.
   - O formulário aceita formatos copiados diretamente do jogo (ex: `{x, y, z}`).

3. **Gerar e Baixar**:
   - Clique em **"Gerar Configuração"** para validar e criar o código Lua.
   - Clique em **"Baixar Configuração"** para salvar o arquivo `.txt` pronto para uso no script.

4. **Carregar Existente**:
   - Você também pode fazer upload de um arquivo de configuração existente `.txt` ou `.lua` para editar as informações sem precisar redigitar tudo.

## 📂 Estrutura de Arquivos

- `index.html`: Página principal (Berçário).
- `organization.html`: Página de Organização.
- `stables.html`: Página de Estábulo.
- `index.js`: Lógica principal (Geração, Leitura de Arquivos, Checkpoints Dinâmicos).
- `index.css`: Estilização global (Tema escuro, responsividade).

## ✨ Tecnologias

- **HTML5 & CSS3**: Interface moderna e responsiva.
- **JavaScript (Vanilla)**: Lógica de parsing e geração de arquivos sem dependências externas.