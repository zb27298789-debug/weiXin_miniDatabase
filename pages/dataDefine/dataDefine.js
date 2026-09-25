const app = getApp();

Page({
  data: {
    fields: [],
    draftName: '',
    draftType: 'number',
    draftTypeIndex: 0,
    draftPrecision: 1,
    editingIndex: -1,
    fieldTypeOptions: ['number', 'text', 'date', 'boolean'],
    fieldTypeLabels: ['数字型', '字符型', '日期型', '布尔型']
  },

  getFieldTypeLabel(type) {
    const map = {
      number: '数字型',
      text: '字符型',
      date: '日期型',
      boolean: '布尔型'
    };
    return map[type] || '数字型';
  },

  onLoad() {
    this.loadFields();
  },

  onShow() {
    this.loadFields();
  },

  loadFields() {
    const fields = app.getFields().map((field) => ({
      ...field,
      typeLabel: this.getFieldTypeLabel(field.type)
    }));
    this.setData({ fields });
  },

  onFieldNameInput(e) {
    this.setData({ draftName: e.detail.value.trim() });
  },

  onSelectFieldType(e) {
    const fieldTypeOptions = this.data.fieldTypeOptions;
    const selected = Number(e.currentTarget.dataset.index);
    if (Number.isNaN(selected) || !fieldTypeOptions[selected]) return;
    this.setData({
      draftType: fieldTypeOptions[selected],
      draftTypeIndex: selected
    });
  },

  onPrecisionChange(e) {
    this.setData({ draftPrecision: Number(e.detail.value) || 1 });
  },

  addField() {
    const name = this.data.draftName;
    if (!name) {
      wx.showToast({ title: '请输入字段名称', icon: 'none' });
      return;
    }

    const fields = app.getFields();
    const exists = fields.some(item => item.name.toLowerCase() === name.toLowerCase() || item.id === name);
    if (exists) {
      wx.showToast({ title: '字段已存在', icon: 'none' });
      return;
    }

    const field = {
      id: name,
      name,
      type: this.data.draftType,
      precision: this.data.draftType === 'number' ? this.data.draftPrecision : undefined,
      autoToday: false,
      typeLabel: this.getFieldTypeLabel(this.data.draftType)
    };

    fields.push(field);
    app.setFields(fields);
    this.setData({
      fields: fields.map(item => ({ ...item, typeLabel: this.getFieldTypeLabel(item.type) })),
      draftName: '',
      draftType: 'number',
      draftTypeIndex: 0,
      draftPrecision: 1
    });
    wx.showToast({ title: '已添加字段', icon: 'success' });
  },

  editField(e) {
    const index = Number(e.currentTarget.dataset.index);
    const field = this.data.fields[index];
    const typeIndex = this.data.fieldTypeOptions.indexOf(field.type);
    this.setData({
      editingIndex: index,
      draftName: field.name,
      draftType: field.type,
      draftTypeIndex: typeIndex >= 0 ? typeIndex : 0,
      draftPrecision: field.precision || 1
    });
  },

  saveField() {
    if (this.data.editingIndex < 0) {
      this.addField();
      return;
    }

    const name = this.data.draftName;
    if (!name) {
      wx.showToast({ title: '请输入字段名称', icon: 'none' });
      return;
    }

    const fields = app.getFields();
    const current = fields[this.data.editingIndex];
    if (!current) return;

    const duplicate = fields.some((item, idx) => idx !== this.data.editingIndex && (item.name.toLowerCase() === name.toLowerCase() || item.id === name));
    if (duplicate) {
      wx.showToast({ title: '字段已存在', icon: 'none' });
      return;
    }

    current.name = name;
    current.id = name;
    current.type = this.data.draftType;
    current.precision = this.data.draftType === 'number' ? this.data.draftPrecision : undefined;
    current.autoToday = current.autoToday || false;
    current.typeLabel = this.getFieldTypeLabel(this.data.draftType);

    app.setFields(fields);
    this.setData({
      fields: fields.map(item => ({ ...item, typeLabel: this.getFieldTypeLabel(item.type) })),
      editingIndex: -1,
      draftName: '',
      draftType: 'number',
      draftTypeIndex: 0,
      draftPrecision: 1
    });
    wx.showToast({ title: '字段已更新', icon: 'success' });
  },

  cancelEdit() {
    this.setData({ editingIndex: -1, draftName: '', draftType: 'number', draftTypeIndex: 0, draftPrecision: 1 });
  },

  deleteField(e) {
    const index = Number(e.currentTarget.dataset.index);
    const fields = app.getFields();
    const field = fields[index];
    if (!field) return;

    if (field.autoToday || field.id === 'date') {
      wx.showToast({ title: '日期字段不能删除', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: `删除字段“${field.name}”？`,
      success: (res) => {
        if (!res.confirm) return;
        fields.splice(index, 1);
        app.setFields(fields);
        this.setData({ fields });
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  },

  moveField(e) {
    const index = Number(e.currentTarget.dataset.index);
    const direction = e.currentTarget.dataset.direction;
    const fields = app.getFields();

    if (Number.isNaN(index) || !fields[index]) return;

    const step = direction === 'up' ? -1 : 1;
    const target = index + step;

    if (target < 0) {
      wx.showToast({ title: '已经是第一个字段', icon: 'none' });
      return;
    }
    if (target >= fields.length) {
      wx.showToast({ title: '已经是最后一个字段', icon: 'none' });
      return;
    }

    const moved = fields.splice(index, 1)[0];
    fields.splice(target, 0, moved);
    app.setFields(fields);

    let editingIndex = this.data.editingIndex;
    if (editingIndex === index) {
      editingIndex = target;
    } else if (editingIndex === target) {
      editingIndex = index;
    }

    this.setData({
      fields: fields.map(item => ({ ...item, typeLabel: this.getFieldTypeLabel(item.type) })),
      editingIndex
    });
    wx.showToast({ title: '已调整顺序', icon: 'none' });
  }
});
