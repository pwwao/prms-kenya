#!/usr/bin/env bash
# =============================================================================
# PRMS — Ubuntu Server Security Hardening
# Applies CIS Ubuntu 22.04 LTS Level 1 baseline + OWASP recommendations
# Run ONCE on a fresh server before first deploy
# Requires: sudo privileges
# =============================================================================

set -euo pipefail

info()  { echo -e "\033[0;32m[INFO]\033[0m $*"; }
warn()  { echo -e "\033[1;33m[WARN]\033[0m $*"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $*"; exit 1; }

[[ $EUID -eq 0 ]] || error "Run as root: sudo $0"

DEPLOY_USER="deploy"

# ─── 1. System updates ────────────────────────────────────────────────────────
info "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  ufw fail2ban unattended-upgrades apt-listchanges \
  curl jq git awscli docker.io docker-compose \
  logwatch auditd

# ─── 2. Create deploy user ───────────────────────────────────────────────────
if ! id "$DEPLOY_USER" &>/dev/null; then
  info "Creating deploy user..."
  useradd -m -s /bin/bash -G docker "$DEPLOY_USER"
  mkdir -p /home/$DEPLOY_USER/.ssh
  chmod 700 /home/$DEPLOY_USER/.ssh
  # Copy your deploy public key here:
  # echo "ssh-rsa AAAA..." >> /home/$DEPLOY_USER/.ssh/authorized_keys
  chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys 2>/dev/null || true
  chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
fi

# ─── 3. SSH hardening ────────────────────────────────────────────────────────
info "Hardening SSH..."
cat > /etc/ssh/sshd_config.d/prms-hardening.conf << 'EOF'
# PRMS SSH Hardening — CIS Level 1
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitEmptyPasswords no
X11Forwarding no
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers deploy
Protocol 2
HostbasedAuthentication no
IgnoreRhosts no
EOF
systemctl restart sshd

# ─── 4. UFW Firewall ─────────────────────────────────────────────────────────
info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    comment 'SSH'
ufw allow 80/tcp    comment 'HTTP (redirect to HTTPS)'
ufw allow 443/tcp   comment 'HTTPS'
# PM2 monitoring — internal only (not exposed externally)
# ufw allow from 10.0.0.0/8 to any port 9615
ufw --force enable
ufw status verbose

# ─── 5. Fail2ban ─────────────────────────────────────────────────────────────
info "Configuring Fail2ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5
backend  = systemd

[sshd]
enabled = true
maxretry = 3
bantime  = 86400

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter  = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 10
EOF
systemctl enable fail2ban
systemctl restart fail2ban

# ─── 6. Automatic security updates ───────────────────────────────────────────
info "Enabling automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Mail "devops@prms.health.go.ke";
EOF
systemctl enable unattended-upgrades

# ─── 7. Docker security ───────────────────────────────────────────────────────
info "Configuring Docker daemon security..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  },
  "live-restore": true,
  "no-new-privileges": true,
  "icc": false,
  "userland-proxy": false
}
EOF
systemctl restart docker

# ─── 8. Kernel hardening (sysctl) ────────────────────────────────────────────
info "Applying sysctl hardening..."
cat > /etc/sysctl.d/99-prms-hardening.conf << 'EOF'
# IP spoofing protection
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0

# Ignore broadcast pings
net.ipv4.icmp_echo_ignore_broadcasts = 1

# SYN flood protection
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 5

# File descriptor limits
fs.file-max = 100000

# Disable core dumps
fs.suid_dumpable = 0
EOF
sysctl -p /etc/sysctl.d/99-prms-hardening.conf

# ─── 9. Deploy directories ───────────────────────────────────────────────────
info "Creating deploy directories..."
mkdir -p /opt/prms/{logs,keys,secrets}
chown -R $DEPLOY_USER:$DEPLOY_USER /opt/prms
chmod 750 /opt/prms/secrets /opt/prms/keys

# ─── 10. Audit daemon ─────────────────────────────────────────────────────────
info "Enabling auditd..."
systemctl enable auditd
# Log authentication events
auditctl -w /etc/passwd -p wa -k identity
auditctl -w /etc/ssh/sshd_config -p wa -k sshd_config

info "✅ Security hardening complete."
info "Next steps:"
info "  1. Add deploy user SSH public key to /home/$DEPLOY_USER/.ssh/authorized_keys"
info "  2. Run: bash secrets.sh init"
info "  3. Copy .env and keys/ to /opt/prms/"
info "  4. Run: docker-compose -f docker-compose.prod.yml up -d"
