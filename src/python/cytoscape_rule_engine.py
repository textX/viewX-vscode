from cytoscape_helper import ViewStyle

node_shapes = ('ellipse', 'triangle', 'rectangle', 'roundrectangle', 'cutrectangle', 'bottomroundrectangle', 'barrel',
               'rhomboid', 'diamond', 'pentagon', 'hexagon', 'concavehexagon', 'heptagon', 'octagon', 'star', 'vee')
node_background = ('background-color', 'background-blacken', 'background-opacity')
node_border = ('border-width', 'border-style', 'border-color', 'border-opacity')
node_border_style = ('solid', 'dotted', 'dashed', 'double')
edge_start_rules = ['EdgeStartProperty', 'LinkFromProperty']


class PropertyVisitor(object):
    """
    Abstract visitor class with a visit method for each Cytoscape.js
    element's style property which is supported by viewX grammar.

    Each visit method resolves property based on grammar and forms css style definition for it.
    """
    def __init__(self):
        self.view_style = None
        self.switch_visit = {}

    def visit(self, _property, key=None):
        visit = self.switch_visit.get(key if key else _property.__class__.__name__, self.visit_default)
        visit(_property)

    def visit_width(self, _property):
        if _property.width:
            self.view_style.style['width'] = _property.width

    def visit_height(self, _property):
        if _property.height:
            self.view_style.style['height'] = _property.height

    def visit_background(self, _property):
        if _property.background.color:
            self.view_style.style['background-color'] = _property.background.color
        elif _property.background.image:
            self.view_style.style['background-image'] = _property.background.image
            self.view_style.style['background-fit'] = 'cover cover'
        self.view_style.style['background-opacity'] = _property.background.opacity\
            if _property.background.opacity is not None else 1
    
    def visit_border(self, _property):
        self.view_style.style['border-color'] = _property.border.color
        self.view_style.style['border-width'] = _property.border.width
        self.view_style.style['border-style'] = _property.border.style if _property.border.style else 'solid'
        self.view_style.style['border-opacity'] = _property.border.opacity\
            if _property.border.opacity is not None else 1

    def visit_padding(self, _property):
        self.view_style.style['padding'] = '{}{}'.format(_property.padding,
                                                         'px' if _property.unit is None else _property.unit)
        if _property.relative_to:
            self.view_style.style['padding-relative-to'] = _property.relative_to

    def visit_line(self, _property):
        self.view_style.style['line-color'] = _property.color
        self.view_style.style['width'] = _property.width
        self.view_style.style['line-style'] = _property.style if _property.style else 'solid'

    def visit_label(self, _property):
        # label value is always evaluated during interpretation because it can depend on model
        # once evaluated it is assigned to graph element in data section so we just need to reference it here
        self.view_style.style['label'] = 'data(label)'
        for label_property in _property.label_properties:
            if label_property.__class__.__name__ == 'LabelFont':
                self.view_style.style['color'] = label_property.color if label_property.color else 'black'
                self.view_style.style['font-size'] = label_property.size
                self.view_style.style['font-style'] = label_property.style if label_property.style else 'normal'
                self.view_style.style['font-weight'] = label_property.weight if label_property.weight else 'normal'
            elif label_property.__class__.__name__ == 'LabelBackground':
                self.view_style.style['text-background-color'] = label_property.color if label_property.color else 'white'
                self.view_style.style['text-background-opacity'] = label_property.opacity\
                    if label_property.opacity is not None else 1
                shape = label_property.shape if label_property.shape else ''
                self.view_style.style['text-background-shape'] = shape + 'rectangle'
            elif label_property.__class__.__name__ == 'LabelOutline':
                self.view_style.style['text-outline-color'] = label_property.color if label_property.color else 'white'
                self.view_style.style['text-outline-width'] = label_property.width\
                    if label_property.width is not None else 1
                self.view_style.style['text-outline-opacity'] = label_property.opacity\
                    if label_property.opacity is not None else 1
            elif label_property.__class__.__name__ == 'LabelMargin':
                self.view_style.style['text-margin-x'] = label_property.x_axis
                self.view_style.style['text-margin-y'] = label_property.x_axis\
                    if label_property.y_axis is None else label_property.y_axis

    def visit_edge_property(self, _property):
        direction = 'source' if _property.__class__.__name__ in edge_start_rules else 'target'
        for arrow_property in _property.arrow_properties:
            if arrow_property.__class__.__name__ == 'ArrowShapeProperty':
                self.view_style.style['{}-arrow-color'.format(direction)] = arrow_property.color\
                    if arrow_property.color else 'black'
                self.view_style.style['arrow-scale'] = arrow_property.scale
                self.view_style.style['{}-arrow-shape'.format(direction)] = arrow_property.shape\
                    if arrow_property.shape else 'none'
                self.view_style.style['{}-arrow-fill'.format(direction)] = arrow_property.fill\
                    if arrow_property.fill else 'filled'
            elif arrow_property.__class__.__name__ == 'EndpointDistance':
                self.view_style.style['{}-distance-from-node'.format(direction)] = arrow_property.distance\
                    if arrow_property.distance else 0

    def visit_link_style_property(self, _property):
        if _property.__class__.__name__ == 'LinkStyleCurved' or _property is None:
            self.view_style.style['curve-style'] = 'bezier'
            if _property and _property.step:
                self.view_style.style['control-point-step-size'] = _property.step
        elif _property.__class__.__name__ == 'LinkStyleCurvedControlPoints':
            self.view_style.style['curve-style'] = 'unbundled-bezier'
            self.view_style.style['control-point-distances'] = _property.control_points
            self.view_style.style['control-point-weights'] = create_cp_weights(_property.control_points)
        elif _property == 'straight':
            self.view_style.style['curve-style'] = 'segments'
            self.view_style.style['segment-distances'] = [0]
            self.view_style.style['segment-weights'] = [0.5]
        elif _property.__class__.__name__ == 'LinkStyleStraightControlPoints':
            self.view_style.style['curve-style'] = 'segments'
            self.view_style.style['segment-distances'] = _property.control_points
            self.view_style.style['segment-weights'] = create_cp_weights(_property.control_points)
        elif _property == 'haystack':
            self.view_style.style['curve-style'] = 'haystack'

    def visit_default(self, _property):
        pass


def create_cp_weights(distances):
    """
    Create evenly distributed control points based on passed distance values.
    :param distances: distances of control points on line perpendicular to the link curve
    :return: control point weights (distance of control points from source element
    on imaginary line between source and target element)
    """
    length = distances.__len__()
    return [w / (length + 1) for w in range(1, length + 1)]


class ViewStylePropertyVisitor(PropertyVisitor):
    """
    Concrete visitor class for viewX 'View' grammar rule.
    """
    def __init__(self, view, container=False, nested_properties=None, selector_postfix=''):
        super().__init__()
        
        self.switch_visit = {
            'WidthProperty': self.visit_width,
            'HeightProperty': self.visit_height,
            'BackgroundProperty': self.visit_background,
            'BorderProperty': self.visit_border,
            'LineProperty': self.visit_line,
            'PaddingProperty': self.visit_padding,
            'Label': self.visit_label,
            'EdgeStartProperty': self.visit_edge_property,
            'EdgeEndProperty': self.visit_edge_property,
            'LinkStyleProperty': self.visit_link_style_property
        }

        if view.shape.__class__.__name__ == 'LinkShape':
            self.view_style = ViewStyle('edge.{}{}'.format(view.name.lower(), selector_postfix))
            self.visit(view.shape.style, 'LinkStyleProperty')
        elif view.shape.lower() in node_shapes:
            self.view_style = ViewStyle('node.{}{}{}'.format(
                view.name.lower(), '-container' if container else '', selector_postfix))
            if container:
                self.view_style.style['shape'] = view.container.lower() if container else view.shape.lower()
            elif hasattr(nested_properties, 'shape') and nested_properties.shape:
                self.view_style.style['shape'] = nested_properties.shape.lower()
            else:
                self.view_style.style['shape'] = view.shape.lower()

        else:
            self.view_style = ViewStyle('root')

        property_holder = nested_properties if nested_properties else view
        for prop in property_holder.properties:
            self.visit(prop)


class LinkStylePropertyVisitor(PropertyVisitor):
    """
    Concrete visitor class for viewX 'PropertyLink' grammar rule.
    """
    def __init__(self, view, property_link, nested_properties=None, selector_postfix=''):
        super().__init__()
        
        self.switch_visit = {
            'LinkFromProperty': self.visit_edge_property,
            'LinkToProperty': self.visit_edge_property,
            'LineProperty': self.visit_line,
            'Label': self.visit_label,
            'LinkStyleProperty': self.visit_link_style_property
        }

        # form edge class as structured path (this uniquely identifies groups of property edges)
        self.view_style = ViewStyle('edge.{}-{}{}'.format(view.name.lower(),
                                    '-'.join(property_link.link_to.class_properties), selector_postfix))

        property_holder = property_link if nested_properties is None else nested_properties

        if hasattr(property_holder, 'style') and property_holder.style:
            self.visit(property_holder.style, 'LinkStyleProperty')
        else:
            self.view_style.style['curve-style'] = 'bezier'  # default link style, needed to enable arrow shapes

        if hasattr(property_holder, 'link_from'):
            self.visit(property_holder.link_from)
        if hasattr(property_holder, 'link_to'):
            self.visit(property_holder.link_to)
        for prop in property_holder.properties:
            self.visit(prop)
