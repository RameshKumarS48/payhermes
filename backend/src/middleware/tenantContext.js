function tenantContext(req, res, next) {
  if (req.user && req.user.businessId) {
    req.businessId = req.user.businessId;
  }
  next();
}

module.exports = tenantContext;
