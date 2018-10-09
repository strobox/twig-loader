var getOptions = require("loader-utils").getOptions;
var validateOptions = require("schema-utils");

var schema = {
    type: "object",
    properties: {
        twigOptions: {
            type: "object",
        },
        ignoreExtends: {
            type: "array"
        }
    },
};

module.exports = function(loader) {
    var options = getOptions(loader), validate = true;
    if (!options) {
        validate = false;
        options = {};
    }
    if(!options.ignoreExtends) options.ignoreExtends = []
    if(validate) validateOptions(schema, options, "twig-loader");
    return options;
};
