const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, '../data');
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const DB_PATH = path.join(__dirname, 'search_index.db');
const HANDBOOK_PATH = path.join(__dirname, '../../LANTERN_ENGINE.md');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);
db.serialize(() => {
    db.run("CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(container, entry, file, content)");
});

const indexDocument = (container, entry, file, content) => {
    const cleanContent = content.replace(/<[^>]*>?/gm, '');
    db.run("DELETE FROM search_index WHERE container = ? AND entry = ? AND file = ?", [container, entry, file], (err) => {
        db.run("INSERT INTO search_index(container, entry, file, content) VALUES (?, ?, ?, ?)", [container, entry, file, cleanContent]);
    });
};

const deindexEntry = (container, entry) => {
    db.run("DELETE FROM search_index WHERE container = ? AND entry = ?", [container, entry]);
};

const deindexContainer = (container) => {
    db.run("DELETE FROM search_index WHERE container = ?", [container]);
};

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// 1.0 Root API Status
app.get('/api', (req, res) => {
    res.json({
        engine: "LANTERN",
        version: "1.0.0",
        status: "ACTIVE",
        endpoints: {
            handbook: "/api/handbook",
            manifest: "/api/manifest",
            work_queue: "/api/work-queue",
            search: "/api/search?q=",
            stats: "/api/stats",
            locations: "/api/locations"
        }
    });
});

// 2.0 Global Statistics & Handbook
app.get('/api/stats', (req, res) => {
    const containers = fs.readdirSync(DATA_DIR).filter(d => fs.statSync(path.join(DATA_DIR, d)).isDirectory());
    let totalNodes = 0; let pendingAI = 0; let completed = 0; let drafts = 0;
    containers.forEach(container => {
        const containerPath = path.join(DATA_DIR, container);
        const entries = fs.readdirSync(containerPath).filter(e => fs.statSync(path.join(containerPath, e)).isDirectory());
        totalNodes += entries.length;
        entries.forEach(entry => {
            const intentPath = path.join(containerPath, entry, 'intent.json');
            if (fs.existsSync(intentPath)) {
                try {
                    const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
                    if (intent.status === 'AI_PROCESSING_REQUESTED') pendingAI++;
                    else if (intent.status === 'COMPLETED') completed++;
                    else if (intent.description && intent.description.length > 0) drafts++;
                } catch (e) {}
            }
        });
    });
    res.json({ totalNodes, pendingAI, completed, drafts });
});

app.get('/api/handbook', (req, res) => {
    if (fs.existsSync(HANDBOOK_PATH)) {
        res.send(fs.readFileSync(HANDBOOK_PATH, 'utf8'));
    } else {
        res.status(404).send("Handbook not found");
    }
});

app.get('/api/manifest', (req, res) => {
    const manifest = [];
    const containers = fs.readdirSync(DATA_DIR).filter(d => fs.statSync(path.join(DATA_DIR, d)).isDirectory());
    containers.forEach(container => {
        const containerPath = path.join(DATA_DIR, container);
        const entries = fs.readdirSync(containerPath).filter(e => fs.statSync(path.join(containerPath, e)).isDirectory());
        entries.forEach(entry => {
            const intentPath = path.join(containerPath, entry, 'intent.json');
            if (fs.existsSync(intentPath)) {
                try {
                    const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
                    manifest.push({ container, entry, name: intent.name, status: intent.status });
                } catch (e) {}
            }
        });
    });
    res.json(manifest);
});

// 3.0 Search
app.get('/api/search', (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);
    db.all("SELECT container, entry, file, content FROM search_index WHERE content MATCH ? ORDER BY rank", [query], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 4.0 Image Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// 5.0 Containers
app.get('/api/containers', (req, res) => {
    const dirs = fs.readdirSync(DATA_DIR, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
            const metaPath = path.join(DATA_DIR, dirent.name, 'meta.json');
            let meta = { name: dirent.name.replace(/_/g, ' '), image_url: '' };
            if (fs.existsSync(metaPath)) meta = { ...meta, ...JSON.parse(fs.readFileSync(metaPath, 'utf8')) };
            return { id: dirent.name, ...meta };
        });
    res.json(dirs);
});

app.post('/api/containers', (req, res) => {
    const { name, image_url } = req.body;
    const containerId = name.trim().replace(/\s+/g, '_');
    const containerDir = path.join(DATA_DIR, containerId);
    if (!fs.existsSync(containerDir)) {
        fs.mkdirSync(containerDir, { recursive: true });
        fs.writeFileSync(path.join(containerDir, 'meta.json'), JSON.stringify({ name: name.trim(), image_url: image_url || '' }, null, 2));
    }
    res.json({ id: containerId, name: name.trim(), image_url: image_url || '' });
});

app.post('/api/containers/:id/meta', (req, res) => {
    const { name, image_url } = req.body;
    const containerDir = path.join(DATA_DIR, req.params.id);
    if (fs.existsSync(containerDir)) {
        const metaPath = path.join(containerDir, 'meta.json');
        const meta = { name: name.trim(), image_url: image_url || '' };
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Container not found' });
    }
});

app.delete('/api/containers/:id', (req, res) => {
    const containerDir = path.join(DATA_DIR, req.params.id);
    if (fs.existsSync(containerDir)) {
        fs.rmSync(containerDir, { recursive: true, force: true });
        deindexContainer(req.params.id);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Container not found' });
    }
});

// 6.0 Entries
app.get('/api/containers/:container/entries', (req, res) => {
    const containerDir = path.join(DATA_DIR, req.params.container);
    if (!fs.existsSync(containerDir)) return res.json([]);
    const entries = fs.readdirSync(containerDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
            const intentPath = path.join(containerDir, dirent.name, 'intent.json');
            let name = dirent.name.replace(/_/g, ' '); let description = ""; let status = "IDLE";
            if (fs.existsSync(intentPath)) {
                try {
                    const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
                    name = intent.name || name; description = intent.description || ""; status = intent.status || "IDLE";
                } catch (e) { }
            }
            return { id: dirent.name, name, description, status };
        });
    res.json(entries);
});

app.post('/api/containers/:container/entries', (req, res) => {
    const { name, description } = req.body;
    const entryId = name.trim().replace(/\s+/g, '_');
    const entryDir = path.join(DATA_DIR, req.params.container, entryId);
    if (!fs.existsSync(entryDir)) {
        fs.mkdirSync(entryDir, { recursive: true });
        const intent = { id: entryId, name: name.trim(), description: description || "", status: "IDLE", sections: [] };
        fs.writeFileSync(path.join(entryDir, 'intent.json'), JSON.stringify(intent, null, 2));
    }
    res.json({ id: entryId, name: name.trim() });
});

app.get('/api/entries/:container/:entry', (req, res) => {
    const entryDir = path.join(DATA_DIR, req.params.container, req.params.entry);
    if (!fs.existsSync(entryDir)) return res.status(404).json({ error: 'Entry not found' });
    const result = { intent: {}, docs: {} };
    const intentPath = path.join(entryDir, 'intent.json');
    if (fs.existsSync(intentPath)) result.intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
    ['definitions', 'blueprints', 'architecture', 'schema'].forEach(doc => {
        const docPath = path.join(entryDir, `${doc}.md`);
        result.docs[doc] = fs.existsSync(docPath) ? fs.readFileSync(docPath, 'utf8') : '';
    });
    res.json(result);
});

app.post('/api/entries/:container/:entry/intent', (req, res) => {
    const entryDir = path.join(DATA_DIR, req.params.container, req.params.entry);
    if (!fs.existsSync(entryDir)) return res.status(404).json({ error: 'Entry not found' });
    const intentPath = path.join(entryDir, 'intent.json');
    fs.writeFileSync(intentPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
});

app.post('/api/entries/:container/:entry/docs/:type', (req, res) => {
    const entryDir = path.join(DATA_DIR, req.params.container, req.params.entry);
    if (!fs.existsSync(entryDir)) return res.status(404).json({ error: 'Entry not found' });
    const docPath = path.join(entryDir, `${req.params.type}.md`);
    fs.writeFileSync(docPath, req.body.content);
    indexDocument(req.params.container, req.params.entry, req.params.type, req.body.content);
    res.json({ success: true });
});

app.delete('/api/entries/:container/:entry', (req, res) => {
    const entryDir = path.join(DATA_DIR, req.params.container, req.params.entry);
    if (fs.existsSync(entryDir)) {
        fs.rmSync(entryDir, { recursive: true, force: true });
        deindexEntry(req.params.container, req.params.entry);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Entry not found' });
    }
});

// 7.0 Work Queue
app.get('/api/work-queue', (req, res) => {
    const queue = [];
    const containers = fs.readdirSync(DATA_DIR).filter(d => fs.statSync(path.join(DATA_DIR, d)).isDirectory());
    containers.forEach(container => {
        const containerPath = path.join(DATA_DIR, container);
        const entries = fs.readdirSync(containerPath).filter(e => fs.statSync(path.join(containerPath, e)).isDirectory());
        entries.forEach(entry => {
            const intentPath = path.join(containerPath, entry, 'intent.json');
            if (fs.existsSync(intentPath)) {
                try {
                    const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
                    if (intent.status === 'AI_PROCESSING_REQUESTED') queue.push({ container, entry, name: intent.name });
                } catch (e) {}
            }
        });
    });
    res.json(queue);
});

// 8.0 Spatial Locations (Map Engine - Integrated with Registry)
const WORLD_MAP_CONTAINER = 'World_Map';

app.get('/api/locations', (req, res) => {
    const containerDir = path.join(DATA_DIR, WORLD_MAP_CONTAINER);
    if (!fs.existsSync(containerDir)) return res.json([]);
    
    const entries = fs.readdirSync(containerDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => {
            const intentPath = path.join(containerDir, dirent.name, 'intent.json');
            if (fs.existsSync(intentPath)) {
                try {
                    const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'));
                    if (intent.x !== undefined && intent.y !== undefined) {
                        return { 
                            id: dirent.name, 
                            name: intent.name, 
                            description: intent.description, 
                            type: intent.type || 'village',
                            x: intent.x,
                            y: intent.y,
                            image_url: intent.image_url || ''
                        };
                    }
                } catch (e) {}
            }
            return null;
        }).filter(entry => entry !== null);
    res.json(entries);
});

app.post('/api/locations', (req, res) => {
    try {
        const locations = req.body;
        const containerDir = path.join(DATA_DIR, WORLD_MAP_CONTAINER);
        if (!fs.existsSync(containerDir)) fs.mkdirSync(containerDir, { recursive: true });

        const existingEntries = fs.readdirSync(containerDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const incomingIds = locations.map(loc => loc.id.toString());

        existingEntries.forEach(id => {
            if (!incomingIds.includes(id) && id !== 'meta.json') {
                const entryPath = path.join(containerDir, id);
                fs.rmSync(entryPath, { recursive: true, force: true });
            }
        });

        locations.forEach(loc => {
            const entryId = loc.id.toString();
            const entryDir = path.join(containerDir, entryId);
            if (!fs.existsSync(entryDir)) fs.mkdirSync(entryDir, { recursive: true });

            const intentPath = path.join(entryDir, 'intent.json');
            let intent = { sections: [] };
            if (fs.existsSync(intentPath)) {
                try { intent = JSON.parse(fs.readFileSync(intentPath, 'utf8')); } catch(e) {}
            }

            intent = {
                ...intent,
                id: entryId,
                name: loc.name,
                description: loc.description,
                type: loc.type,
                x: loc.x,
                y: loc.y,
                image_url: loc.image_url,
                status: intent.status || 'IDLE'
            };

            fs.writeFileSync(intentPath, JSON.stringify(intent, null, 2));
        });

        res.json({ success: true });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: 'Failed to sync spatial registry' }); 
    }
});

app.listen(PORT, () => {
    console.log(`Lantern GDD Engine API running at http://localhost:${PORT}`);
});
