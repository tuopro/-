const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const res = await db.collection('users').orderBy('createTime', 'desc').get();
    return { code: 0, data: res.data };
  } catch (err) {
    return { code: -1, errMsg: err.message };
  }
};
