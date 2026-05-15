const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27017/multiplayerDB';

const sfidaSchema = new mongoose.Schema({
  nome: String,
  giocatori: [String],
  vincitore: String,
  data: { type: Date, default: Date.now }
});

const Sfida = mongoose.model('Sfida', sfidaSchema);

async function testDB() {
  try {
    console.log(`Connessione a ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Connesso a MongoDB con successo!');

    await Sfida.deleteMany({}); // Pulisce il db

    console.log('Salvataggio "Sfida di Prova"...');
    const nuovaSfida = new Sfida({
      nome: 'Sfida di Prova',
      giocatori: ['Player1', 'Player2'],
      vincitore: 'Player1'
    });
    await nuovaSfida.save();
    console.log('Sfida salvata correttamente.');

    console.log('Rilettura dal database...');
    const sfideSalvate = await Sfida.find();
    console.log('Risultato della lettura:', sfideSalvate);

  } catch (err) {
    console.error('Errore durante il test del DB:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnesso dal DB.');
  }
}

testDB();
