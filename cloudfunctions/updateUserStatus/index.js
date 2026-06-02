const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

exports.main = async (event, context) => {
  const { id, status } = event;
  if (!id || !status) {
    return { code: -1, errMsg: '缺少参数' };
  }
  if (!['approved', 'rejected'].includes(status)) {
    return { code: -1, errMsg: '无效的状态值' };
  }
  try {
    await db.collection('users').doc(id).update({
      data: { status }
    });
    return { code: 0 };
  } catch (err) {
    return { code: -1, errMsg: err.message };
  }
};
