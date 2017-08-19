from cytoscape_helper import ViewStyle

edge_shapes = ('Line')
node_shapes = ('ellipse', 'triangle', 'rectangle', 'roundrectangle', 'cutrectangle', 'rhomboid',
                'diamond', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'star', 'vee')

node_background = ('background-color', 'background-blacken', 'background-opacity')
node_border = ('border-width', 'border-style', 'border-color', 'border-opacity')

node_border_style = ('solid', 'dotted', 'dashed', 'double')

class ViewStylePropertyVisitor(object):
    view_style = None
    
    def __init__(self, view):
        if view.shape in edge_shapes:
            self.view_style = ViewStyle('edge.{}'.format(view.name.lower()))
        elif view.shape.lower() in node_shapes:
            self.view_style = ViewStyle('node.{}'.format(view.name.lower()))
            self.view_style.style['shape'] = view.shape.lower()
        else:
            print('root level style properties')
            self.view_style = ViewStyle('root')

    def visit(self, _property):
        switch_visit = {
            'BackgroundProperty': self.visit_background,
            'BorderProperty': self.visit_border,
            'StrokeProperty': self.visit_stroke,
            'Label': self.visit_label,
            'EdgeStartProperty': self.visit_edge_property,
            'EdgeEndProperty': self.visit_edge_property
        }
        visit = switch_visit.get(_property.__class__.__name__, self.visit_default)
        visit(_property)

    def visit_background(self, _property):
        print('visit_background')
        if _property.background.__class__.__name__ == 'ColorFn':
            self.view_style.style['background-color'] = _property.background.color
        elif _property.background.__class__.__name__ == 'ImageFn':
            self.view_style.style['background-image'] = _property.background.image
            self.view_style.style['background-fit'] = 'cover cover'
        else:
            pass
    
    def visit_border(self, _property):
        print('visit_border')
        self.view_style.style['border-width'] = _property.border.width
        self.view_style.style['border-style'] = _property.border.style
        self.view_style.style['border-color'] = _property.border.color

    def visit_stroke(self, _property):
        print('visit_stroke')
        self.view_style.style['width'] = _property.width
        self.view_style.style['line-color'] = _property.color
        self.view_style.style['line-style'] = _property.style if _property.style else 'solid'

    def visit_label(self, _property):
        print('visit_label')
        self.view_style.style['label'] = 'data(label)'
        for label_property in _property.labelProperties:
            if label_property.__class__.__name__ == 'LabelFont':
                self.view_style.style['font-size'] = label_property.size
                self.view_style.style['font-style'] = label_property.style if label_property.style else 'normal'
                self.view_style.style['color'] = label_property.color if label_property.color else 'black'
            elif label_property.__class__.__name__ == 'LabelBackground':
                self.view_style.style['text-background-color'] = label_property.color if label_property.color else 'white'
                self.view_style.style['text-background-opacity'] = label_property.opacity if label_property.opacity else 0
                self.view_style.style['text-background-shape'] = label_property.shape if label_property.shape else 'rectangle'

    def visit_edge_property(self, _property):
        print('visit_edge_property')
        direction = 'source' if _property.__class__.__name__ == 'EdgeStartProperty' else 'target'
        for arrow_property in _property.arrowProperties:
            self.view_style.style['curve-style'] = 'bezier' # needed to enable arrow shapes
            self.view_style.style['arrow-scale'] = arrow_property.scale
            self.view_style.style['{}-arrow-shape'.format(direction)] = arrow_property.shape if arrow_property.shape else 'none'
            self.view_style.style['{}-arrow-fill'.format(direction)] = arrow_property.fill if arrow_property.fill else 'filled'
            self.view_style.style['{}-arrow-color'.format(direction)] = arrow_property.color if arrow_property.color else 'black'

    def visit_default(self, _property):
        pass