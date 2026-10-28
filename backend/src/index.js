
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;
const searchRoutes = require('./routes/search.routes');

app.use(cors());
app.use(express.json());
app.use('/trains', searchRoutes);
app.use('/auth', require('./routes/auth.routes'));
app.use('/admin', require('./routes/admin.routes'));
// Health-check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Railway Reservation backend running on port ${PORT}`);
  });
}

module.exports = app;
