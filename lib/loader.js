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
    var resPath = require.resolve(this.resource),
        id = hashGenerator(resPath + source),
        options = getOptions(this),
        tpl, comp;

    Twig.extend(function(Twig) {
        var compiler = Twig.compiler;
        compiler.module['webpack'] = compilerFactory(options);
    });

    mapcache.set(id, resPath)

    this.cacheable && this.cacheable();

    tpl = Twig.twig({
        id: id,
        resPath: resPath,
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
    },{mapToPrimitives:options.mapToPrimitives})
    console.log("🙋🏻‍♂️");
    let includes = [];
    if(tpl.includes)
        Object.keys(tpl.includes).forEach( inclAlias => {
            let resPath = tpl.includes[inclAlias];
            if(!resPath.match(/\/\\/)) resPath = resPath.slice(0,1) + './' + resPath.slice(1);
            return includes.push(`var ${inclAlias} = require(${resPath});`);
        });
    let extendsTpl = tpl.isExtend, ignoreExtend = false //
    if(tpl.isExtend && options.ignoreExtends) {
        let extendsFname = extendsTpl.replace(/['"]/g,'');
        if(!extendsFname.match(/\/\\/)) extendsFname = path.join(path.dirname(resPath),extendsFname)
        if(options.ignoreExtends.find( ign => ign.indexOf(extendsFname)>=0)) {
            ignoreExtend = true;// disable extend
        }
    }
    let cmpStr = comp.cmpString;
    if(ignoreExtend) {
        extendsTpl = "";
    }
    if(extendsTpl && !extendsTpl.match(/\/\\/)) extendsTpl = extendsTpl.slice(0,1) + './' + extendsTpl.slice(1);
    var res = `
        var React = require("react");
        ${ extendsTpl ? ' var parent = require(' + extendsTpl + ');' : '' }
        ${ options.mapToPrimitives ? "var primi = require('react-primitives')" : '' }
        ${ includes.length ? includes.join('\n') : '' }
        const R = {
            c: React.createElement,
            F: React.Fragment,
        }
        ${ !extendsTpl && comp.blocksStr ? ` var self_blocks = ${comp.blocksStr}; ` : ''}
        ${ extendsTpl ? `module.exports = p => parent(Object.assign({twig_blocks:${comp.blocksStr}},p))`
                : `module.exports = p => ${cmpStr||'null'};`
        }

    `
    this.callback(null, res);
};
