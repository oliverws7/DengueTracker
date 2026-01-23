require('dotenv').config(); // <-- GARANTE QUE O SCRIPT ACESSE O .env
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const realizarBackup = () => {
    const URI = process.env.MONGODB_URI;
    
    if (!URI) {
        console.error("❌ Erro: MONGODB_URI não definida no .env");
        return;
    }

    const BACKUP_PATH = path.join(__dirname, '../../backups');
    const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
    const FOLDER_NAME = `backup-${TIMESTAMP}`;

    if (!fs.existsSync(BACKUP_PATH)) {
        fs.mkdirSync(BACKUP_PATH, { recursive: true });
    }

    const outputDir = path.join(BACKUP_PATH, FOLDER_NAME);

    // CORREÇÃO PARA ATLAS: Usar --uri entre aspas e limitar coleções paralelas
    const cmd = `mongodump --uri="${URI}" --out="${outputDir}" --numParallelCollections=1`;

    console.log(`⏳ Iniciando backup para Atlas...`);

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Erro no Backup: ${error.message}`);
            return;
        }
        console.log(`✅ Backup Atlas concluído com sucesso em: ${FOLDER_NAME}`);
    });
};

// Permite chamar o script direto via: node src/scripts/backup.js
if (require.main === module) {
    realizarBackup();
}

module.exports = realizarBackup;