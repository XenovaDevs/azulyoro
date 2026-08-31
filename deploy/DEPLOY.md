# Deploy de Azul y Oro en VPS compartido

Topología: Cloudflare proxied → Nginx → Next.js en `127.0.0.1:3102` y API
.NET en `127.0.0.1:5000` → PostgreSQL local.

Este VPS aloja otros proyectos de producción. Los artefactos de Azul y Oro
usan únicamente `/var/www/azulyoro`, `/etc/azulyoro`, los servicios
`azulyoro-*` y los hosts `azulyoro.com.ar`/`api.azulyoro.com.ar`. No cambiar
UFW, certificados ni server blocks de otros sitios como parte de este deploy.

## 1. Preparar el usuario y las variables vacías

```bash
sudo useradd --system --home-dir /var/lib/azulyoro --create-home \
  --shell /usr/sbin/nologin azulyoro
sudo install -d -o root -g root -m 0755 /etc/azulyoro
sudo install -d -o root -g root -m 0755 /var/www/azulyoro/releases
sudo install -d -o azulyoro -g azulyoro -m 0750 /var/backups/azulyoro

sudo install -o root -g root -m 0600 deploy/env/api.env.example /etc/azulyoro/api.env
sudo install -o root -g root -m 0600 deploy/env/web.env.example /etc/azulyoro/web.env
sudo install -o root -g root -m 0600 deploy/env/backup.env.example /etc/azulyoro/backup.env
```

Los tres archivos quedan vacíos a propósito. Antes de iniciar la aplicación,
completar como mínimo:

`/etc/azulyoro/api.env`

```ini
ConnectionStrings__Postgres=
AllowedHosts=azulyoro.com.ar;api.azulyoro.com.ar
ApiFootball__Key=
ApiFootball__BaseUrl=https://v3.football.api-sports.io
Brevo__ApiKey=
Brevo__FromEmail=no-reply@azulyoro.com.ar
Brevo__FromName=Azul y Oro
Frontend__BaseUrl=https://azulyoro.com.ar
Frontend__RevalidateSecret=
Auth__CookieDomain=.azulyoro.com.ar
Cors__Origins__0=https://azulyoro.com.ar
```

`/etc/azulyoro/web.env`

```ini
NEXT_PUBLIC_API_URL=https://api.azulyoro.com.ar
NEXT_PUBLIC_SITE_URL=https://azulyoro.com.ar
REVALIDATE_SECRET=
```

`Frontend__RevalidateSecret` y `REVALIDATE_SECRET` deben ser exactamente el
mismo secreto. Generar secretos fuera del repositorio, por ejemplo con
`openssl rand -hex 32`. La contraseña de PostgreSQL tampoco debe quedar en
GitHub Actions ni en el checkout.

El autodeploy se niega a ejecutar si faltan estas variables o si los dos
secretos compartidos no coinciden. El API también se niega a iniciar en
Production sin una clave Brevo, para no escribir links de verificación o reset
en los logs.

## 2. PostgreSQL

Crear un rol y base exclusivos para este proyecto, con una contraseña que se
guarde sólo en `ConnectionStrings__Postgres`:

```bash
sudo -u postgres createuser azulyoro --pwprompt
sudo -u postgres createdb azulyoro -O azulyoro
```

No abrir el puerto 5432: debe continuar escuchando sólo en loopback. Las
migraciones se ejecutan en un servicio oneshot aislado
(`azulyoro-migrate@<sha>.service`) antes de cambiar el release activo.

## 3. Instalar servicios y backup

```bash
sudo install -o root -g root -m 0755 deploy/backup/pg-backup.sh \
  /usr/local/libexec/azulyoro-pg-backup
sudo install -o root -g root -m 0644 deploy/systemd/azulyoro-api.service \
  /etc/systemd/system/azulyoro-api.service
sudo install -o root -g root -m 0644 deploy/systemd/azulyoro-web.service \
  /etc/systemd/system/azulyoro-web.service
sudo install -o root -g root -m 0644 deploy/systemd/azulyoro-migrate@.service \
  /etc/systemd/system/azulyoro-migrate@.service
sudo install -o root -g root -m 0644 deploy/systemd/azulyoro-backup.service \
  /etc/systemd/system/azulyoro-backup.service
sudo install -o root -g root -m 0644 deploy/systemd/azulyoro-backup.timer \
  /etc/systemd/system/azulyoro-backup.timer
sudo install -o root -g root -m 0750 deploy/scripts/azulyoro-deploy.sh \
  /usr/local/sbin/azulyoro-deploy
sudo systemctl daemon-reload
```

El timer de backup debe quedar desactivado hasta completar `backup.env` con
PostgreSQL y un destino off-box de `rclone`. Sólo entonces:

```bash
sudo systemctl enable --now azulyoro-backup.timer
sudo systemctl start azulyoro-backup.service
sudo systemctl status azulyoro-backup.timer azulyoro-backup.service --no-pager
```

Un backup que sólo existe en este VPS no se considera suficiente.

## 4. Primer deploy y autodeploy

El deploy es atómico: publica en `releases/<sha>`, corre migraciones, cambia
el symlink `current`, reinicia los dos servicios y prueba `/health`. Ante un
fallo intenta volver al release anterior. Nunca hace `git reset --hard` y
aborta si el checkout tiene cambios locales.

Primer deploy, ejecutado manualmente después de completar los env files:

```bash
sudo /usr/local/sbin/azulyoro-deploy
```

El autodeploy corre dentro del VPS, igual que los otros servicios que usan
este servidor. GitHub Actions lo dispara inmediatamente después de cada push
a `main`. El timer también consulta `origin/main` cada dos minutos como
respaldo, sólo acepta avances fast-forward y se niega a desplegar si el
checkout tiene cambios locales. El deploy existente mantiene el lock, las
migraciones, el health check y el rollback atómico.

Instalarlo una sola vez:

```bash
sudo install -o root -g root -m 0750 deploy/scripts/azulyoro-autodeploy.sh \
  /usr/local/sbin/azulyoro-autodeploy
sudo install -o root -g root -m 0644 deploy/systemd/azulyoro-autodeploy.service \
  /etc/systemd/system/azulyoro-autodeploy.service
sudo install -o root -g root -m 0644 deploy/systemd/azulyoro-autodeploy.timer \
  /etc/systemd/system/azulyoro-autodeploy.timer
sudo systemctl daemon-reload
sudo systemctl enable --now azulyoro-autodeploy.timer
```

Para el disparo inmediato se usa un usuario SSH sin acceso interactivo. Su
única clave tiene `restrict` y un forced command que sólo puede arrancar y
esperar a `azulyoro-autodeploy.service`. El usuario sólo recibe permiso sudo
para ese comando exacto de systemd; no tiene acceso root general.

Instalar el wrapper y el sudoers rule:

```bash
sudo install -o root -g root -m 0755 deploy/scripts/azulyoro-ci-deploy.sh \
  /usr/local/sbin/azulyoro-ci-deploy
sudo install -o root -g root -m 0440 deploy/sudoers/azulyoro-deploy-hook \
  /etc/sudoers.d/azulyoro-deploy-hook
sudo visudo -cf /etc/sudoers.d/azulyoro-deploy-hook
sudo install -o root -g root -m 0644 deploy/ssh/azulyoro-deploy-hook.conf \
  /etc/ssh/sshd_config.d/azulyoro-deploy-hook.conf
sudo sshd -t
sudo systemctl reload ssh.service
```

El bloque `Match User` permite autenticación sólo por clave para este usuario
automatizado, incluso si la política global exige clave y contraseña. También
desactiva contraseña, teclado interactivo, TTY, X11 y TCP forwarding sólo para
esta cuenta; no cambia la autenticación de los demás usuarios del VPS.

El workflow requiere estas variables de Actions:

- `DEPLOY_HOST`: IP pública del VPS.
- `DEPLOY_PORT`: puerto SSH.
- `DEPLOY_USER`: `azulyoro-deploy-hook`.

Y estos secrets:

- `DEPLOY_SSH_KEY`: clave privada exclusiva para este repositorio.
- `DEPLOY_KNOWN_HOSTS`: host key Ed25519 del VPS, fijada previamente para
  impedir conexiones a un servidor suplantado.

El servidor sigue usando su propio acceso de sólo lectura al repositorio. La
clave de Actions no puede elegir comandos ni editar el checkout: únicamente
despierta el deploy local ya protegido. Revisar actividad con:

```bash
sudo systemctl status azulyoro-autodeploy.timer --no-pager
sudo journalctl -u azulyoro-autodeploy.service -n 100 --no-pager
```

## 5. Nginx, Cloudflare y TLS

Hace falta crear en Cloudflare, todos proxied (nube naranja):

- `azulyoro.com.ar` → IP del VPS
- `www.azulyoro.com.ar` → IP del VPS
- `api.azulyoro.com.ar` → IP del VPS

Configurar SSL/TLS de Cloudflare en **Full (strict)** y emitir un Origin
Certificate que incluya `azulyoro.com.ar`, `www.azulyoro.com.ar` y
`api.azulyoro.com.ar`. Guardarlo como:

```text
/etc/nginx/ssl/azulyoro.com.ar.pem  # root:root, 0644
/etc/nginx/ssl/azulyoro.com.ar.key  # root:root, 0600
```

Recién con DNS y certificado listos:

```bash
sudo install -o root -g root -m 0644 deploy/nginx/cloudflare-allow.conf \
  /etc/nginx/snippets/azulyoro-cloudflare.conf
sudo install -o root -g root -m 0644 deploy/nginx/azulyoro.conf \
  /etc/nginx/sites-available/azulyoro
sudo ln -s /etc/nginx/sites-available/azulyoro \
  /etc/nginx/sites-enabled/azulyoro
sudo nginx -t
sudo systemctl reload nginx
```

El include de Cloudflare es específico de estos server blocks y bloquea el
acceso directo al origen. No se modifica la política global de UFW porque eso
podría cortar otros sistemas productivos del VPS. El include debe actualizarse
si Cloudflare publica nuevos rangos.

## 6. Comprobaciones

```bash
sudo systemctl is-active azulyoro-api azulyoro-web
curl -fsS http://127.0.0.1:5000/health
curl -I https://azulyoro.com.ar/
curl -fsS https://api.azulyoro.com.ar/health
sudo systemctl status azulyoro-api azulyoro-web --no-pager
```

Validar además que `/api/admin/*` responda `401/403` sin sesión Admin, que el
registro/login soporte CSRF y rate limit, que el email llegue por Brevo, que
el publish revalide Next y que el backup pueda restaurarse en un entorno
separado.
