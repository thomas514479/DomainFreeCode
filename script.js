const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const vhost = require('vhost');

const app = express();
const PORT = 3000;
const DOMAIN = 'domainfreecode.com';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do Multer para upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const sub = req.body.subdomain;
        if (!sub) return cb(new Error('Subdomínio não informado'));
        const dir = path.join(UPLOADS_DIR, sub);
        await fs.ensureDir(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// Rota para upload de arquivos
app.post('/upload', upload.array('files'), async (req, res) => {
    const sub = req.body.subdomain;
    if (!sub) return res.status(400).json({ error: 'Subdomínio não informado' });
    res.json({
        message: 'Arquivos enviados com sucesso!',
        url: `https://${sub}.${DOMAIN}/`
    });
});

// Função para criar um app estático para cada subdomínio
function createSubdomainApp(sub) {
    const dir = path.join(UPLOADS_DIR, sub);
    if (fs.existsSync(dir)) {
        const subApp = express();
        subApp.use(express.static(dir));
        return subApp;
    }
    return null;
}

// Middleware para servir arquivos estáticos baseado no subdomínio usando vhost
app.use((req, res, next) => {
    const host = req.headers.host;
    // host pode ser: nome.domainfreecode.com:3000 ou nome.domainfreecode.com
    const sub = host && host.split('.')[0];
    if (
        sub &&
        sub !== 'www' &&
        sub !== 'domainfreecode' &&
        sub !== 'localhost' &&
        sub !== '127'
    ) {
        const subApp = createSubdomainApp(sub);
        if (subApp) {
            return vhost(`${sub}.${DOMAIN}`, subApp)(req, res, next);
        }
    }
    next();
});

// Página inicial simples
app.get('/', (req, res) => {
    res.send('Backend do domainfreecode.com rodando!');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Configure seu DNS para *.domainfreecode.com apontar para este servidor.`);
});

/**
 * Observações:
 * - Para acessar os arquivos, use: https://nome.domainfreecode.com/arquivo.html
 * - Configure o DNS do seu domínio para aceitar subdomínios wildcard (*.domainfreecode.com)
 * - Para produção, use HTTPS e configure um proxy reverso (ex: Nginx)
 * - O pacote 'vhost' é usado para hospedar subdomínios de forma adequada.
 */
