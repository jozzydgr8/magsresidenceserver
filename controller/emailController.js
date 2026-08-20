const sendEmail = require('../config/mailer');


// ==========================================
// SEND SINGLE / MULTIPLE MESSAGE
// ==========================================

const sendSingleMessage = async (req, res) => {
  const {
    subject,
    message,
    recipient_email,
  } = req.body;

  try {

    // ----------------------------------------
    // VALIDATE SUBJECT AND MESSAGE
    // ----------------------------------------

    if (!subject || !message) {
      return res.status(400).json({
        message: 'Subject and message are required.',
      });
    }


    // ----------------------------------------
    // VALIDATE RECIPIENT
    // ----------------------------------------

    if (
      !recipient_email ||
      (
        !Array.isArray(recipient_email) &&
        typeof recipient_email !== 'string'
      )
    ) {
      return res.status(400).json({
        message: 'At least one recipient is required.',
      });
    }


    // ----------------------------------------
    // NORMALIZE RECIPIENTS
    // ----------------------------------------

    const recipients = Array.isArray(recipient_email)
      ? recipient_email
      : [recipient_email];


    // ----------------------------------------
    // REMOVE EMPTY / INVALID VALUES
    // ----------------------------------------

    const cleanRecipients = [
      ...new Set(
        recipients
          .filter(
            (email) =>
              typeof email === 'string'
          )
          .map((email) =>
            email.trim().toLowerCase()
          )
          .filter(Boolean)
      ),
    ];


    if (cleanRecipients.length === 0) {
      return res.status(400).json({
        message: 'No valid recipient email found.',
      });
    }


    // ----------------------------------------
    // SEND EMAILS
    // ----------------------------------------

    const emailPromises = cleanRecipients.map(
      (email) =>
        sendEmail({
          subject,
          message,
          recipient_email: email,
        })
    );


    await Promise.all(emailPromises);


    // ----------------------------------------
    // SUCCESS
    // ----------------------------------------

    return res.status(200).json({
      message: 'Email successfully sent.',
      recipients: cleanRecipients.length,
    });

  } catch (error) {

    console.error(
      'SEND EMAIL ERROR:',
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        'Failed to send email.',
    });
  }
};


module.exports = {
  sendSingleMessage,
};
