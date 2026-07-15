require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
const path = require('path');
connectDB();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/courses',  require('./routes/courses'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/gcompris',   require('./routes/gcompris'));
app.use('/api/coin-config',require('./routes/coinConfig'));
app.use('/api/artweaver', require('./routes/artweaver'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
