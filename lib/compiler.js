var path = require("path");
var hashGenerator = require("hasha");
var _ = require("underscore");
var loaderUtils = require("loader-utils");
var mapcache = require("./mapcache");

module.exports = function(options) {
    return function(id, tokens, pathToTwig) {
        var includes = [];
        var resourcePath = mapcache.get(id);
        console.log(resourcePath);
        var processDependency = function(token) {
            includes.push(token.value);
            console.log(token.value);
            token.value = hashGenerator(path.resolve(path.dirname(resourcePath), token.value));
            console.log(token.value);
        };

        var processToken = function(token) {
            if (token.type == "logic" && token.token.type) {
                switch(token.token.type) {
                    case 'Twig.logic.type.block':
                    case 'Twig.logic.type.if':
                    case 'Twig.logic.type.elseif':
                    case 'Twig.logic.type.else':
                    case 'Twig.logic.type.for':
                    case 'Twig.logic.type.spaceless':
                    case 'Twig.logic.type.macro':
                        _.each(token.token.output, processToken);
                        break;
                    case 'Twig.logic.type.extends':
                    case 'Twig.logic.type.include':
                        _.each(token.token.stack, processDependency);
                        break;
                    case 'Twig.logic.type.embed':
                        _.each(token.token.output, processToken);
                        _.each(token.token.stack, processDependency);
                        break;
                    case 'Twig.logic.type.import':
                    case 'Twig.logic.type.from':
                        if (token.token.expression != '_self') {
                            _.each(token.token.stack, processDependency);
                        }
                        break;
                }
            }
        };

        var parsedTokens = JSON.parse(tokens);

        _.each(parsedTokens, processToken);

        var opts = Object.assign({}, options.twigOptions, {
            id: id,
            data: parsedTokens,
            allowInlineIncludes: true,
            rethrow: true,
        });
        var output = [
            'var twig = require("' + pathToTwig + '").twig,',
            '    template = twig(' + JSON.stringify(opts) + ');\n',
            'module.exports = template'
        ];

        if (includes.length > 0) {
            _.each(_.uniq(includes), function(file) {
                output.unshift("require("+ JSON.stringify(file) +");\n");
            });
        }

        return `
            var React = require("React"),
                twig = require("${pathToTwig}").twig,
                template = twig(${JSON.stringify(opts)});
            const R = {
                c: React.createElement,
                F: React.Fragment,
            }
            if(template.isExtend) {
                module.exports = template;
            } else {
                module.exports = template;
            }

        `
    };
};
