#!/bin/bash

# Iniciar o servidor WebSocket (Terminal Interativo) em segundo plano
php /var/www/html/plugins/interactive_terminal/server.php &

# Iniciar o Apache em primeiro plano
apache2-foreground
