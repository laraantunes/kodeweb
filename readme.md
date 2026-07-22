# KodeWeb IDE 🚀

**KodeWeb** é uma IDE leve e moderna baseada em PHP e JavaScript, projetada para ser hospedada diretamente em um servidor web. Ela permite gerenciar, criar e editar arquivos, gerenciar conexões com Banco de Dados, Git, FTP e SSH, tudo de forma integrada e segura.

![Kodeweb IDE](kodeweb-view.png)

---

## ✨ Funcionalidades Principais

*   **Editor de Código Ace**: Integrado via CDN com tema Darcula, autocomplete inteligente e suporte a realce de sintaxe para dezenas de linguagens e atalhos globais de salvamento.
*   **Gerenciador de Arquivos**: Árvore de arquivos carregada sob demanda. Suporta criação, renomeação, deleção e drag-and-drop de arquivos locais para upload no servidor.
*   **Git Integrado**: Painel visual de versionamento! Veja arquivos modificados (Staged/Unstaged), visualize o Diff completo em uma aba dedicada, faça commits, push, pull, e navegue por uma árvore visual do `git log`.
*   **Terminal Multitarefa (Local e SSH)**: Um terminal emulado que rastreia diretórios locais de forma inteligente. E mais: você pode salvar credenciais SSH (usando senhas criptografadas no servidor) e abrir abas de terminal conectadas diretamente em seus servidores remotos!
*   **Explorador de Banco de Dados (DB Explorer)**:
    *   Suporte a **MySQL**, **PostgreSQL** e **SQLite**.
    *   Navegue por bancos e tabelas visualmente no painel central da IDE.
    *   Editor global de **Consultas SQL Customizadas** com Syntax Highlighting e atalho `Ctrl+Enter` para rodar instruções livres.
    *   Interface elegante para listar, editar e gerenciar as conexões.
*   **Cliente FTP Embutido**: Salve conexões FTP e navegue/edite arquivos de servidores remotos diretamente no KodeWeb como se fossem locais.
*   **Busca Global Avançada**: Encontre qualquer termo ou expressão dentro do seu projeto inteiro através do atalho rápido de busca em arquivos.
*   **Criptografia AES-256-CBC**: Todas as senhas (bancos, FTP, SSH, Login) são salvas em sua máquina host de forma blindada, protegidas via chaves dinâmicas na pasta de conexões.

---

## 🛠️ Requisitos do Sistema

1.  **Servidor Web**: Apache (recomendado, com `mod_rewrite` e arquivos `.htaccess`) ou Nginx.
2.  **PHP**: Versão 7.4 ou superior (Totalmente compatível com PHP 8.x).
3.  **Extensões do PHP**:
    *   `openssl` (necessária para criptografia das credenciais).
    *   `pdo` e drivers (ex: `pdo_mysql`, `pdo_pgsql`, `pdo_sqlite`) para banco de dados.
    *   `ftp` (para o explorador FTP remoto).
    *   Habilitação das funções shell (`shell_exec`, `exec`, `proc_open`) para funcionamento do Git e Terminal local.
    *   (O terminal SSH utiliza internamente a biblioteca `phpseclib3`, não exigindo extensões nativas extras).

---

## 🔒 Instalação e Configuração

### 1. Download e Instalação (Via Release)
A forma oficial e recomendada de instalar o KodeWeb é baixando a versão já empacotada na página de **Releases** do GitHub.

1. Acesse a página de Releases e baixe o arquivo `kodeweb-release.zip` mais recente.
2. Descompacte todo o conteúdo na pasta pública do seu servidor web (por exemplo, `/var/www/html/kodeweb` ou `public_html/kodeweb`).
*(Nota: O `.zip` oficial já inclui a pasta `vendor` com todas as dependências do Composer).*

**Para desenvolvedores:** Caso prefira fazer o deploy via `git clone`, você deverá executar `composer install` manualmente na pasta.

### 2. Instalação Inicial e Criação de Usuário
O acesso ao KodeWeb é restrito a você.
1. Acesse a pasta da IDE no seu navegador (ex: `http://localhost/kodeweb`).
2. Você será redirecionado para a tela de **Instalação**.
3. Defina seu **Usuário** e **Senha** mestre.
4. O sistema gerará automaticamente uma chave de criptografia interna forte (`.key`) para proteger senhas de bancos, FTP e SSH.

### 3. Permissões de Pasta
O usuário do servidor web (`www-data` ou `http`) deve possuir permissão de escrita e leitura na pasta raiz do KodeWeb, para conseguir gerenciar e salvar arquivos:
```bash
chown -R www-data:www-data /caminho/para/kodeweb
chmod -R 755 /caminho/para/kodeweb
```

### 4. Atualização Inteligente (One-Click Update)
Não é mais necessário usar o terminal para manter a IDE atualizada! O KodeWeb conta com um **Atualizador Integrado**. 
Basta abrir o menu `Opções` -> `Sobre` na interface e clicar em **Buscar Atualizações**. A IDE fará o download silencioso do `.zip` da última release do GitHub e se auto-atualizará sem apagar suas configurações ou bancos de dados salvos.

---

## ⌨️ Atalhos Úteis

*   **Salvar arquivo**: `Ctrl + S` (Windows/Linux) ou `Cmd + S` (macOS).
*   **Fechar aba**: `Alt + W` / `Option + W`.
*   **Busca Global de Arquivos**: `Ctrl + P` / `Cmd + P`.
*   **Rodar SQL**: `Ctrl + Enter` (dentro da tela de Consulta Customizada do DB Explorer).
*   **Alternar painel lateral**: `Ctrl + B` ou arraste a barra de expansão.
*   **Alternar Markdown Preview**: Abra um arquivo `.md` e clique no botão de preview na janela de edição.

## 📱 Quer um editor dedicado para celulares?

Experimente o [KodeWeb Lite](https://github.com/laraantunes/kodeweblite), o "irmão mais novo" do KodeWeb IDE, criado especialmente para ser usado em celulares!
