const axios = require('axios');
axios.get('http://192.168.1.133', {
  timeout: 3 * 1000,
  validateStatus: () => true,
}).then(res => console.log(res.status, res.statusText)).catch(err => console.error(err.code, err.message));
