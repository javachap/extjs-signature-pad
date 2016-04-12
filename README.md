# extjs-signature-pad
ExtJS Signature Pad - Compatible with >= ExtJS 5.

## Usage:

```  javascript
Ext.define('Javachap.example.SignatureWindow', {
    extend : 'Ext.Window',
    xtype : 'egSignatureWindo',
    requires: [
       'Ext.ux.sign.SignaturePad',
    ],
    width : 400,
    height: 200,
    layout : 'fit',
    modal: true,
    autoShow: true,
    title: 'Sign Terms and Conditions',
    
    items: [{
        xtype : "container",
        layout: {
            type: 'vbox',
            align: 'stretch',
            pack  : 'start'
        },
        items: [{
            html: 'By signing below you agree to approve to our Terms and Conditions',
            padding: 4
        },{
            xtype: 'panel',
            border: 1,
            margin: 5,
            bodyStyle: 'border-style: dotted',
            layout: 'fit',
            flex: 1,
            items: [{
                xtype: 'signaturePad'
            }]
        }]
    }]
});
```

Prepopulating the Signature:

``` javascript
var signPad = me.down('signaturePad');
signPad.fromDataURL("data:image/png;base64," + signatureBase64);
```

## Credits:
This Component is built using HTML5 Signature Pad (http://szimek.github.io/signature_pad/) by szimek

## License
Released under the [MIT License](http://www.opensource.org/licenses/MIT).