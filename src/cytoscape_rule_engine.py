from cytoscape_helper import ViewStyle

edge_shapes = ('Line')
node_shapes = ('ellipse', 'triangle', 'rectangle', 'roundrectangle', 'cutrectangle', 'rhomboid',
                'diamond', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'star', 'vee')

node_background = ('background-color', 'background-blacken', 'background-opacity')
node_border = ('border-width', 'border-style', 'border-color', 'border-opacity')

node_border_style = ('solid', 'dotted', 'dashed', 'double')

class ViewStylePropertyVisitor(object):
    view_style = None
    
    def __init__(self, shape):
        selector = 'edge' if shape in edge_shapes else 'node'
        self.view_style = ViewStyle(selector)
        self.view_style.style['shape'] = shape.lower()

    def visit(self, _property):
        switch_visit = {
            'BackgroundProperty': self.visit_background,
            'StrokeProperty': self.visit_stroke
        }
        visit = switch_visit.get(_property.__class__.__name__, self.visit_default)
        visit(_property)

    def visit_background(self, _property):
        print('visit_background')
        print(_property)
        print(dir(_property))
        print(_property.background)
        print(dir(_property.background))
    
    def visit_stroke(self, _property):
        print('visit_stroke')
        pass

    def visit_default(self, _property):
        pass