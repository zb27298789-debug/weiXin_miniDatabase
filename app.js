App({
  onLaunch() {
    this.ensureDefaults();
  },

  ensureDefaults() {
    const storedFields = wx.getStorageSync('miniDatabase_fields');
    if (!storedFields || !Array.isArray(storedFields) || storedFields.length === 0) {
      wx.setStorageSync('miniDatabase_fields', this.getDefaultFields());
    }

    const storedRecords = wx.getStorageSync('miniDatabase_records');
    if (!storedRecords || !Array.isArray(storedRecords)) {
      wx.setStorageSync('miniDatabase_records', []);
    }
  },

  getDefaultFields() {
    return [
      { id: 'date', name: '日期', type: 'date', autoToday: true },
      { id: 'KH', name: 'KH', type: 'number', precision: 1 },
      { id: 'NO3', name: 'NO3', type: 'number', precision: 1 },
      { id: 'PO4', name: 'PO4', type: 'number', precision: 1 },
      { id: 'Ca', name: 'Ca', type: 'number', precision: 1 },
      { id: 'Mg', name: 'Mg', type: 'number', precision: 1 }
    ];
  },

  getFields() {
    return wx.getStorageSync('miniDatabase_fields') || this.getDefaultFields();
  },

  setFields(fields) {
    wx.setStorageSync('miniDatabase_fields', fields);
  },

  getRecords() {
    return wx.getStorageSync('miniDatabase_records') || [];
  },

  setRecords(records) {
    wx.setStorageSync('miniDatabase_records', records);
  }
});
