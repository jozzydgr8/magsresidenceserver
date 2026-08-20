
const sendEmail = require('../config/mailer');

const sendSingleMessage = async (req, res) => {
  try {
    await sendEmail(req.body);
    res.send({ message: 'Email sent successfully.' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
}




module.exports={ sendSingleMessage}