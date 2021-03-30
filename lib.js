var generateId = function() {
    var d = new Date().getTime();
    var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    return uuid;
};

function convertGetRequestToObject(str){
  var index = str.indexOf("?");
  var s = str.substring(index + 1);
  var arr = {};
  s.split("&").forEach(function(item, index){
    var split = item.split("=");
    arr[split[0]] = split[1];
  });
  return arr;
}

module.exports = { generateId, convertGetRequestToObject };
