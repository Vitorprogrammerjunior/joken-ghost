# 🚀 Guia de Publicação no GitHub

## 📋 Checklist de Preparação

Antes de enviar para o GitHub, verifique se você tem todos estes arquivos:

### ✅ Arquivos Essenciais
- [ ] `jokenghost.py` - Código principal do jogo
- [ ] `README.md` - Documentação do projeto
- [ ] `requirements.txt` - Dependências Python
- [ ] `.gitignore` - Arquivos a serem ignorados
- [ ] `LICENSE` - Licença MIT
- [ ] `setup.py` - Script de instalação
- [ ] `run_game.bat` - Executável para Windows

### ✅ Estrutura de Sprites
- [ ] `Assests/Sprites/Skeleton/` - Sprites do jogador
- [ ] `Assests/Sprites/Kastle/` - Sprites do inimigo

## 🔧 Comandos Git para Publicação

### 1. Inicializar Repositório
```bash
cd "JokenGhost Caçada em Turnos"
git init
```

### 2. Adicionar Arquivos
```bash
git add .
git commit -m "🎮 Initial commit: JokenGhost - Caçada em Turnos

- Jogo completo de RPG com sistema pedra-papel-tesoura
- Personagens animados (Skeleton vs Kastle)
- Sistema de sprites automático
- Animações de combate dinâmicas
- Interface completa com barras de vida"
```

### 3. Conectar ao GitHub
```bash
# Substitua 'seu-usuario' pelo seu username do GitHub
git remote add origin https://github.com/seu-usuario/jokenghost-cacada-em-turnos.git
git branch -M main
git push -u origin main
```

## 🌟 Dicas para um Repositório Profissional

### 📸 Screenshots
Adicione screenshots do jogo no README:
1. Capture tela do menu inicial
2. Capture tela da batalha
3. Capture animações de ataque

### 🏷️ Tags de Release
```bash
# Criar primeira release
git tag -a v1.0.0 -m "🎮 Primeira versão estável do JokenGhost"
git push origin v1.0.0
```

### 📝 Issues e Features
Configure labels no GitHub:
- `bug` - Problemas encontrados
- `enhancement` - Melhorias sugeridas
- `new-character` - Novos personagens
- `documentation` - Melhorias na documentação

## 🎯 Próximos Passos

Após publicar no GitHub:

1. **Configure GitHub Pages** para demonstração online
2. **Adicione screenshots** no README
3. **Crie Issues** para futuras melhorias
4. **Configure Actions** para testes automáticos
5. **Adicione contribuidores** se necessário

## 🔗 Links Úteis

- [GitHub Desktop](https://desktop.github.com/) - Interface gráfica
- [Git Documentation](https://git-scm.com/doc) - Documentação oficial
- [Markdown Guide](https://www.markdownguide.org/) - Para melhorar o README

---

🎮 **Boa sorte com sua publicação!** 👻
