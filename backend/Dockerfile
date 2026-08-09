FROM php:8.2-apache

RUN apt-get update \
    && apt-get install -y \
        $PHPIZE_DEPS \
        libssl-dev \
        pkg-config \
        unzip \
    && docker-php-ext-install pdo_mysql \
    && pecl install mongodb redis \
    && docker-php-ext-enable mongodb redis \
    && a2enmod headers rewrite \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . /var/www/html

EXPOSE 80