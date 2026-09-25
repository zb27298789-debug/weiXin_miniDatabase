const app = getApp();

function toFixedNumber(value, precision) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  return Number(num.toFixed(precision));
}

// 按 RFC 4180 转义 CSV 单元格：统一加双引号，内部的双引号翻倍
function toCsvCell(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

Page({
  data: {
    fields: [],
    form: {},
    records: [],
    selectedIndex: null,
    exportFileName: '',
    fieldTypeMap: {
      number: 'number',
      text: 'text',
      date: 'date'
    }
  },

  onLoad() {
    this.setData({ exportFileName: this.getToday() });
    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const fields = app.getFields();
    const records = app.getRecords();
    const form = {};
    fields.forEach((field) => {
      if (field.type === 'date') {
        form[field.id] = this.getToday();
      } else if (field.type === 'boolean') {
        form[field.id] = false;
      } else {
        form[field.id] = '';
      }
    });

    this.setData({ fields, records, form, selectedIndex: null });
  },

  getToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const form = this.data.form;
    form[field] = value;
    this.setData({ form });
  },

  onDateChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const form = this.data.form;
    form[field] = value;
    this.setData({ form });
  },

  onSwitchChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = !!e.detail.value;
    const form = this.data.form;
    form[field] = value;
    this.setData({ form });
  },

  onExportNameInput(e) {
    this.setData({ exportFileName: e.detail.value });
  },

  saveRecord() {
    const fields = app.getFields();
    const form = { ...this.data.form };
    const record = {};

    fields.forEach((field) => {
      const raw = form[field.id];
      if (field.type === 'date') {
        record[field.id] = raw || this.getToday();
      } else if (field.type === 'number') {
        const precision = field.precision || 1;
        record[field.id] = raw === '' || raw === null || raw === undefined ? '' : toFixedNumber(raw, precision);
      } else if (field.type === 'boolean') {
        record[field.id] = !!raw;
      } else {
        record[field.id] = raw === undefined || raw === null ? '' : String(raw);
      }
    });

    const records = app.getRecords();
    if (this.data.selectedIndex !== null && this.data.selectedIndex >= 0) {
      records[this.data.selectedIndex] = record;
      wx.showToast({ title: '已更新', icon: 'success' });
    } else {
      records.push(record);
      wx.showToast({ title: '已保存', icon: 'success' });
    }

    app.setRecords(records);
    const nextForm = {};
    fields.forEach((field) => {
      if (field.type === 'date') {
        nextForm[field.id] = this.getToday();
      } else if (field.type === 'boolean') {
        nextForm[field.id] = false;
      } else {
        nextForm[field.id] = '';
      }
    });
    this.setData({ records, form: nextForm, selectedIndex: null });
  },

  selectRecord(e) {
    const index = Number(e.currentTarget.dataset.index);
    const record = this.data.records[index];
    if (!record) return;

    const form = { ...record };
    this.setData({ selectedIndex: index, form });
  },

  deleteRecord(e) {
    const index = Number(e.currentTarget.dataset.index);
    const records = app.getRecords();
    wx.showModal({
      title: '确认删除',
      content: '删除这条数据吗？',
      success: (res) => {
        if (!res.confirm) return;
        records.splice(index, 1);
        app.setRecords(records);
        const fields = app.getFields();
        const form = {};
        fields.forEach((field) => {
          if (field.type === 'date') {
            form[field.id] = this.getToday();
          } else if (field.type === 'boolean') {
            form[field.id] = false;
          } else {
            form[field.id] = '';
          }
        });
        this.setData({ records, form, selectedIndex: null });
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  },

  getExportFileName() {
    const raw = String(this.data.exportFileName || '')
      .replace(/\.csv$/i, '')
      .replace(/[\\/:*?"<>|\r\n\t]/g, '')
      .replace(/^\.+/, '')
      .trim();
    return `${raw || this.getToday()}.csv`;
  },

  shouldSaveFileToDisk() {
    let platform = '';
    try {
      const info = typeof wx.getDeviceInfo === 'function' ? wx.getDeviceInfo() : wx.getSystemInfoSync();
      platform = String((info && info.platform) || '').toLowerCase();
    } catch (err) {
      platform = '';
    }
    return platform === 'windows' || platform === 'mac' || platform === 'devtools';
  },

  copyCsvToClipboard(clipboardContent, title) {
    wx.setClipboardData({
      data: clipboardContent,
      success: () => wx.showToast({ title: title || 'CSV 已复制', icon: 'none' })
    });
  },

  shareCsvFile(filePath, fileName, clipboardContent) {
    if (typeof wx.shareFileMessage !== 'function') {
      this.copyCsvToClipboard(clipboardContent, 'CSV 内容已复制');
      return;
    }
    wx.shareFileMessage({
      filePath,
      fileName,
      success: () => wx.showToast({ title: 'CSV 文件已发送', icon: 'success' }),
      fail: (res) => {
        const errMsg = (res && res.errMsg) || '';
        if (errMsg.indexOf('cancel') >= 0) return;
        this.copyCsvToClipboard(clipboardContent, 'CSV 内容已复制');
      }
    });
  },

  deliverCsvFile(filePath, fileName, clipboardContent) {
    if (this.shouldSaveFileToDisk() && typeof wx.saveFileToDisk === 'function') {
      wx.saveFileToDisk({
        filePath,
        success: () => wx.showToast({ title: `${fileName} 已保存`, icon: 'success' }),
        fail: (res) => {
          const errMsg = (res && res.errMsg) || '';
          if (errMsg.indexOf('cancel') >= 0) return;
          this.shareCsvFile(filePath, fileName, clipboardContent);
        }
      });
      return;
    }
    this.shareCsvFile(filePath, fileName, clipboardContent);
  },

  exportCsv() {
    const fields = app.getFields();
    const records = app.getRecords();

    if (!records.length) {
      wx.showToast({ title: '没有可导出的数据', icon: 'none' });
      return;
    }

    const header = fields.map(field => toCsvCell(field.name)).join(',');
    const rows = records.map((record) =>
      fields.map((field) => toCsvCell(record[field.id])).join(',')
    );

    const csvBody = [header, ...rows].join('\r\n');
    // Excel(Windows) 默认按本地编码解析 CSV，文件需带 UTF-8 BOM 才能正确显示中文
    const csvFileContent = `\ufeff${csvBody}`;
    const fileName = this.getExportFileName();
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

    wx.getFileSystemManager().writeFile({
      filePath,
      data: csvFileContent,
      encoding: 'utf8',
      success: () => this.deliverCsvFile(filePath, fileName, csvBody),
      fail: () => this.copyCsvToClipboard(csvBody, '生成失败，CSV 内容已复制')
    });
  }
});
