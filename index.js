function getOTP(length){
    try {
        let digits = "0123456789";
        let OTP = "";
        let len = digits.length;
        for (let i = 0; i < length; i++) {
          OTP += digits[Math.floor(Math.random() * len)];
        }
    
        return OTP;
      } catch (err) {
        throw err;
      }
}

module.exports = getOTP;