FROM php:8.2-apache

# Habilitar módulos do Apache necessários
RUN a2enmod rewrite proxy proxy_http proxy_wstunnel headers

# Instalar dependências do sistema e extensões do PHP
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    dos2unix \
    && docker-php-ext-install zip sockets \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Instalar o Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configurar o diretório de trabalho
WORKDIR /var/www/html

# Copiar os arquivos do projeto para o container
COPY . /var/www/html/

# Instalar dependências do PHP via Composer
RUN composer install --no-dev --optimize-autoloader

# Ajustar permissões
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Copiar o script de inicialização
COPY start.sh /usr/local/bin/start.sh
RUN dos2unix /usr/local/bin/start.sh && chmod +x /usr/local/bin/start.sh

# Expor a porta 80
EXPOSE 80

# Definir o script de inicialização como entrypoint
CMD ["/usr/local/bin/start.sh"]
