#!/bin/bash

# Script para verificar y preparar el despliegue de GitHub Pages
# Uso: ./scripts/setup-github-pages.sh

set -e

echo "🚀 Verificando configuración de GitHub Pages para Stratix"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encontró package.json${NC}"
    echo "   Asegúrate de ejecutar este script desde la raíz del proyecto."
    exit 1
fi

echo -e "${BLUE}📋 Checklist de configuración:${NC}"
echo ""

# 1. Verificar que existe el workflow
if [ -f ".github/workflows/docs.yml" ]; then
    echo -e "${GREEN}✅${NC} Workflow de GitHub Actions configurado"
else
    echo -e "${RED}❌${NC} Workflow de GitHub Actions NO encontrado"
    exit 1
fi

# 2. Verificar que existe TypeDoc config
if [ -f "typedoc.json" ]; then
    echo -e "${GREEN}✅${NC} TypeDoc configurado"
else
    echo -e "${RED}❌${NC} TypeDoc NO configurado"
    exit 1
fi

# 3. Verificar que existe tsconfig.docs.json
if [ -f "tsconfig.docs.json" ]; then
    echo -e "${GREEN}✅${NC} tsconfig.docs.json configurado"
else
    echo -e "${RED}❌${NC} tsconfig.docs.json NO encontrado"
    exit 1
fi

# 4. Verificar que existe DOCUMENTATION.md
if [ -f "DOCUMENTATION.md" ]; then
    echo -e "${GREEN}✅${NC} Guía de documentación creada"
else
    echo -e "${YELLOW}⚠️${NC}  Guía de documentación no encontrada"
fi

# 5. Verificar que existe el script de docs
if grep -q '"api": "typedoc"' package.json; then
    echo -e "${GREEN}✅${NC} Script 'pnpm api' configurado"
else
    echo -e "${RED}❌${NC} Script 'pnpm api' NO configurado"
    exit 1
fi

# 6. Generar documentación de prueba
echo ""
echo -e "${BLUE}📖 Generando documentación de prueba...${NC}"
if pnpm api > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Documentación generada exitosamente"
    
    # Contar páginas generadas
    PAGE_COUNT=$(find docs -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "   ${GREEN}→${NC} ${PAGE_COUNT} páginas HTML generadas"
else
    echo -e "${RED}❌${NC} Error al generar documentación"
    echo "   Ejecuta 'pnpm api' manualmente para ver el error"
    exit 1
fi

# 7. Verificar git remote
echo ""
echo -e "${BLUE}🔗 Información del repositorio:${NC}"
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -n "$REMOTE_URL" ]; then
    echo -e "   ${GREEN}→${NC} Remote: $REMOTE_URL"
    
    # Extraer usuario y repo
    if [[ $REMOTE_URL =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
        GH_USER="${BASH_REMATCH[1]}"
        GH_REPO="${BASH_REMATCH[2]}"
        echo -e "   ${GREEN}→${NC} Usuario: $GH_USER"
        echo -e "   ${GREEN}→${NC} Repositorio: $GH_REPO"
        echo -e "   ${GREEN}→${NC} URL de docs: ${BLUE}https://$GH_USER.github.io/$GH_REPO/${NC}"
    fi
else
    echo -e "${YELLOW}⚠️${NC}  No se encontró remote de git"
fi

# 8. Verificar estado de git
echo ""
echo -e "${BLUE}📦 Estado de Git:${NC}"
CHANGED_FILES=$(git status --short | wc -l | tr -d ' ')
if [ "$CHANGED_FILES" -gt 0 ]; then
    echo -e "   ${YELLOW}⚠️${NC}  Tienes $CHANGED_FILES archivos modificados sin commit"
    echo -e "   ${YELLOW}→${NC}  Ejecuta 'git status' para ver los cambios"
else
    echo -e "   ${GREEN}✅${NC} Working directory limpio"
fi

BRANCH=$(git branch --show-current)
echo -e "   ${GREEN}→${NC} Branch actual: $BRANCH"

# Resumen final
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✨ Configuración verificada exitosamente!${NC}"
echo ""
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo ""
echo "1. Hacer commit y push de los cambios:"
echo "   ${YELLOW}git add .${NC}"
echo "   ${YELLOW}git commit -m 'feat: Add JSDoc/TypeDoc documentation system'${NC}"
echo "   ${YELLOW}git push origin main${NC}"
echo ""
echo "2. Ir a la configuración de GitHub:"
echo "   ${BLUE}https://github.com/$GH_USER/$GH_REPO/settings/pages${NC}"
echo ""
echo "3. En 'Build and deployment' → 'Source':"
echo "   ${YELLOW}Seleccionar: GitHub Actions${NC}"
echo ""
echo "4. Una vez desplegado, la documentación estará en:"
echo "   ${BLUE}https://$GH_USER.github.io/$GH_REPO/${NC}"
echo ""
echo "Para más detalles, consulta: ${BLUE}GITHUB_PAGES_SETUP.md${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
