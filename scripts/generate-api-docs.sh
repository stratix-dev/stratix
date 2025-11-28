#!/bin/bash

set -e

echo "=================================================="
echo "Generando documentación API con TypeDoc"
echo "=================================================="
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar que TypeDoc esté instalado
if ! command -v typedoc &> /dev/null; then
    echo -e "${YELLOW}TypeDoc no está instalado. Instalando...${NC}"
    pnpm add -D -w typedoc
fi

# Limpiar directorio de salida
echo -e "${BLUE}Limpiando directorio docs/api...${NC}"
rm -rf docs/api

# Construir todos los paquetes primero
echo -e "${BLUE}Construyendo paquetes...${NC}"
pnpm build

# Generar documentación
echo -e "${BLUE}Generando documentación API...${NC}"
npx typedoc

# Verificar que se generó correctamente
if [ -d "docs/api" ]; then
    echo ""
    echo -e "${GREEN}=================================================="
    echo -e "Documentación generada exitosamente!"
    echo -e "==================================================${NC}"
    echo ""
    echo "Ubicación: docs/api/index.html"
    echo ""
    echo "Para ver la documentación:"
    echo "  cd docs/api && python3 -m http.server 8080"
    echo "  Luego abre: http://localhost:8080"
    echo ""
else
    echo -e "${YELLOW}Advertencia: No se pudo verificar la generación${NC}"
    exit 1
fi
