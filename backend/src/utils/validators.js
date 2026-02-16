const Joi = require('joi');

const register = Joi.object({
  business_name: Joi.string().min(2).max(100).required(),
  industry: Joi.string().max(100).optional(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().min(1).max(100).required(),
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const funnelGenerate = Joi.object({
  prompt: Joi.string().min(10).max(2000).required(),
  name: Joi.string().max(200).optional(),
});

const funnelCreate = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional(),
  funnel_json: Joi.object().required(),
  trigger_type: Joi.string().valid('new_lead', 'keyword', 'manual').default('new_lead'),
});

const funnelUpdate = Joi.object({
  name: Joi.string().max(200).optional(),
  description: Joi.string().max(1000).optional(),
  funnel_json: Joi.object().optional(),
  status: Joi.string().valid('active', 'draft', 'archived').optional(),
  trigger_type: Joi.string().valid('new_lead', 'keyword', 'manual').optional(),
});

const newLeadWebhook = Joi.object({
  phone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/).required(),
  name: Joi.string().max(200).optional(),
  email: Joi.string().email().optional(),
  source: Joi.string().max(100).optional(),
  funnel_id: Joi.string().uuid().optional(),
  metadata: Joi.object().optional(),
});

const messagingSettings = Joi.object({
  twilio_account_sid: Joi.string().required(),
  twilio_auth_token: Joi.string().required(),
  twilio_phone_number: Joi.string().required(),
  whatsapp_enabled: Joi.boolean().default(false),
});

const businessHours = Joi.object({
  timezone: Joi.string().required(),
  hours: Joi.object().pattern(
    Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    Joi.object({
      enabled: Joi.boolean().required(),
      start: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
      end: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
    })
  ).required(),
});

const appointmentUpdate = Joi.object({
  status: Joi.string().valid('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show').required(),
});

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
    }
    req.validated = value;
    next();
  };
}

module.exports = {
  schemas: { register, login, funnelGenerate, funnelCreate, funnelUpdate, newLeadWebhook, messagingSettings, businessHours, appointmentUpdate },
  validate,
};
