var Twig = require("twig");
var path = require("path");
var hashGenerator = require("hasha");
var mapcache = require("./mapcache");
var compilerFactory = require("./compiler");
var getOptions = require("./getOptions");
Twig.cache(false);
var FakeReact = {
    createElement: () => void 0,
    Fragement: {},
}
module.exports = function(source) {
    var path = require.resolve(this.resource),
        id = hashGenerator(path + source),
        options = getOptions(this),
        tpl, comp;

    Twig.extend(function(Twig) {
        var compiler = Twig.compiler;
        compiler.module['webpack'] = compilerFactory(options);
    });

    mapcache.set(id, path)

    this.cacheable && this.cacheable();

    tpl = Twig.twig({
        id: id,
        path: path,
        data: source,
        allowInlineIncludes: true
    });

    tpl = tpl

    comp = tpl.getReactComp({
        React:FakeReact,
        inh: {
            child: {},
            parent:{},
        },
        inc: {

        }
    })
    console.log("🙋🏻‍♂️");
    let includes = [];
    if(tpl.includes)
        Object.keys(tpl.includes).forEach( inclAlias => {
            let path = tpl.includes[inclAlias];
            if(!path.match(/\/\\/)) path = path.slice(0,1) + './' + path.slice(1);
            return includes.push(`var ${inclAlias} = require(${path});`);
        });
    console.log(tpl.includes);
    var res = `
        var React = require("react");
        ${ tpl.isExtend ? ' var parent = require(' + tpl.isExtend + ');' : '' }
        ${ includes.length ? includes.join('\n') : '' }
        const R = {
            c: React.createElement,
            F: React.Fragment,
        }
        ${ !tpl.isExtend && comp.blocksStr ? ` var self_blocks = ${comp.blocksStr}; ` : ''}
        ${ tpl.isExtend ? `module.exports = p => parent(Object.assign({},p,{twig_blocks:${comp.blocksStr}}))`
                : `module.exports = p => ${comp.cmpString};`
        }

    `
    this.callback(null, res);
};
