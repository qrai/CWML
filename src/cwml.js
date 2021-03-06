const cwml = {
    // Initialization...
    is_initialized: false,
    init: function() {
        var cwmlStyle = document.createElement('style'); 
        cwmlStyle.id = 'cwml-style';
        document.getElementsByTagName("head")[0].appendChild(cwmlStyle);

        this.is_initialized = true;
    },

    // Custom tags...
    tags: {},
    registerTag: function($tag, $attrs={}, $events={}, $props={}, $content=``) {
        if(!this.is_initialized) { this.init(); }

        window.customElements.define($tag.toLowerCase(), 
            class CwmlTag extends HTMLElement { 
                attrs = {}; //tag observed attributes
                events = {}; //tag observed events
                content = ``; //tag content template
                initialInner = ``; //initial inner html of current dom element

                constructor(){
                    //init
                    super(); 
                    this.attrs = $attrs;
                    this.events = $events;
                    this.content = $content;
                    this.initialInner = this.innerHTML;
                    //events
                    for(var event_name in this.events) {
                        var event_func = this.events[event_name];
                        if(!event_name.startsWith('__')) {
                            this.addEventListener(event_name, function(e) { event_func(e.target); } );
                        }
                    }
                    //content
                    if(this.content != '') {
                        let _content = this.content.replaceAll('{inner}', this.initialInner);
                        if(this.hasAttributes()) {
                            for(var attr in this.attributes) {
                                _content = _content.replaceAll('{'+this.attributes[attr].name+'}', this.attributes[attr].textContent)
                            }
                        }
                        this.innerHTML = _content;
                    }
                }

                connectedCallback() { this.events['__added__'] !== undefined ? this.events['__added__'](this) : undefined; }
                disconnectedCallback() { this.events['__removed__'] !== undefined ? this.events['__removed__'](this) : undefined; }
                adoptedCallback() { this.events['__adopted__'] !== undefined ? this.events['__adopted__'](this) : undefined; }

                static get observedAttributes() {
                    let observed = [];
                    // without/with observers
                    if($attrs.constructor == Array) { observed = $attrs; }
                    else if($attrs.constructor == Object) { observed = Object.keys($attrs); }
                    //observe cwml-dynamic attr
                    observed.push('cwml-dynamic');
                    return observed;
                }
                attributeChangedCallback(attrName, oldVal, newVal) {
                    // call attrs observers
                    if(this.attrs.constructor == Object) {
                        this.attrs[attrName] !== undefined ? this.attrs[attrName](this, oldVal, newVal) : undefined;
                    }
                    // reactive content
                    if(this.content != '' && (!this.hasAttribute('cwml-dynamic') || this.attributes['cwml-dynamic'] == 'false')) {
                        let _content = this.content.replaceAll('{inner}', this.initialInner);
                        for(var attr in this.attributes) {
                            _content = _content.replaceAll('{'+this.attributes[attr].name+'}', this.attributes[attr].value)
                        }
                        this.innerHTML = _content;
                    }
                }
            }
        );
        //props
        var css = Object.keys($props).map(function(prop) {
            return `${prop}: ${$props[prop]};`;
        }).join('');
        css += css.includes('display:') ? '' : 'display: block;';
        document.getElementById('cwml-style').innerText += `${$tag} {${css}}\n`;

        //initialize
        this.tags[$tag] = {
            attributes: Object.keys($attrs),
            events: Object.keys($events),
            props: Object.keys($props),
            content: $content
        }
        $events['__init__'] !== undefined ? $events['__init__'](this) : undefined;
    },
    isTagSupported: function(tag) {
        return this.tags[tag] !== undefined;
    },

    // Custom attributes...
    attrs: {},
    registerAttr: function($query, $attr, $callback=function(el,newVal){}) {
        if(!this.is_initialized) { this.init(); }
        
        var targets = document.querySelectorAll($query);
        targets.forEach(target => {
            //callback if attr value set
            if(target.hasAttribute($attr)) {
                $callback(target, target.attributes[$attr].value);
            }
            //observe attributes
            new MutationObserver((mutations,observer) => {
                for(let mutation of mutations) {
                    if(mutation.type == 'attributes' && mutation.attributeName == $attr) {
                        $callback(mutation.target, mutation.target.attributes[$attr].value);
                    }
                }
            }).observe(target,{attributes:true});
        });
        //initialize
        this.attrs[$attr] = {
            query: $query
        };
    },
    isAttrSupported: function(attr) {
        //check custom attributes
        if(this.attrs[attr] !== undefined) { return true; }
        //check custom tags attributes
        this.tags.forEach(tag => {
            if(tag.attributes.includes(attr)) {
                return true;
            }
        });
        return false;
    },
}
