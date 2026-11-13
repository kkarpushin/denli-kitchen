# frozen_string_literal: true
# DENLI draft importer. Run INSIDE SketchUp Desktop, never as a production exporter.
# Ordinary component geometry + metadata; no Dynamic Component formula evaluator.
require 'sketchup.rb'
require 'json'

module DenliDraft
  DICT = 'denli_draft_v1'
  BASE_H = 720.0
  BASE_D = 560.0
  UP_D = 320.0
  THICKNESS = 16.0
  PLINTH = 100.0
  UPPER_Z = 1450.0
  TYPES = %w[filler reserve base drawers cargo sink dw hob hob_oven corner oven fridge fridge_free up up_corner hood shelf].freeze

  def self.number(value, label, min = 0.0, max = 20000.0)
    n = Float(value)
    raise ArgumentError, "Invalid #{label}" unless n.finite? && n >= min && n <= max
    n
  end

  def self.validate(doc)
    raise ArgumentError, 'Expected schema denli-project/1' unless doc['schema'] == 'denli-project/1'
    plan = doc.fetch('plan')
    raise ArgumentError, 'Plan is marked invalid' if plan['valid'] == false
    walls = plan.fetch('walls')
    raise ArgumentError, 'Expected 1-3 walls' unless walls.is_a?(Array) && (1..3).cover?(walls.length)
    number(plan.fetch('ceiling'), 'ceiling', 1600, 6000)
    runs = walls + (plan['island'] ? [plan['island']] : [])
    count = 0
    runs.each do |run|
      length = number(run.fetch('length'), 'wall length', 200, 20000)
      %w[items uppers].each do |key|
        items = run.fetch(key, [])
        raise ArgumentError, 'Expected module array' unless items.is_a?(Array)
        items.each do |item|
          count += 1
          raise ArgumentError, 'Unknown module type' unless TYPES.include?(item.fetch('type'))
          width = number(item.fetch('w'), 'module width', 1, 6000)
          x = number(item.fetch('x'), 'module position', 0, 20000)
          raise ArgumentError, 'Module exceeds wall length' if x + width > length + 1
          number(item.fetch('h', 0), 'upper height', 0, 3000)
        end
      end
    end
    raise ArgumentError, 'Too many modules' if count > 400
    plan
  end

  def self.attributes(entity, values)
    values.each do |key, value|
      entity.set_attribute(DICT, key.to_s, value.is_a?(Hash) || value.is_a?(Array) ? JSON.generate(value) : value)
    end
  end

  # Component axes here follow model geometry; they are not a production cut-list contract.
  def self.box(model, entities, name, x, y, z, width, depth, height, color, metadata = {})
    dims = [width, depth, height].map(&:to_f)
    raise ArgumentError, "Nonpositive panel #{name}" unless dims.all? { |v| v.finite? && v > 0 }
    definition = model.definitions.add(name)
    w, d, h = dims.map(&:mm)
    face = definition.entities.add_face([0, 0, 0], [w, 0, 0], [w, d, 0], [0, d, 0])
    face.reverse! if face.normal.z < 0
    face.pushpull(h)
    material_name = "DENLI draft #{color}"
    material = model.materials[material_name] || model.materials.add(material_name)
    material.color = color
    instance = entities.add_instance(definition, Geom::Transformation.translation([x.mm, y.mm, z.mm]))
    instance.name = name
    instance.material = material
    attributes(instance, metadata.merge('geometry_status' => 'unverified_draft', 'width_mm' => width,
                                        'depth_mm' => depth, 'height_mm' => height))
    instance
  end

  def self.carcass(model, entities, id, type, width, height, depth)
    t = THICKNESS
    raise ArgumentError, "Module #{id} is too narrow" if width <= 2 * t
    panel = lambda do |name, x, y, z, w, d, h|
      box(model, entities, "#{id} #{name}", x, y, z, w, d, h, '#D7CDBE',
          'module_id' => id, 'role' => name, 'material_key' => 'body', 'edge_specification' => 'unknown')
    end
    panel.call('left', 0, 0, 0, t, depth, height)
    panel.call('right', width - t, 0, 0, t, depth, height)
    panel.call('bottom', t, 0, 0, width - 2 * t, depth, t)
    if type == 'up'
      panel.call('top', t, 0, height - t, width - 2 * t, depth, t)
    else
      panel.call('front rail', t, depth - 100, height - t, width - 2 * t, 100, t)
      panel.call('rear rail', t, 0, height - t, width - 2 * t, 100, t)
    end
    # Back mounting, facade gaps, shelves, hardware and appliance clearances require construction rules.
    attributes(entities.parent, 'unmodeled' => %w[back_mounting facades shelves hardware drilling edges])
  end

  def self.wall_transform(walls, index)
    return Geom::Transformation.new if index == 0
    x = walls[0]['length'].to_f
    y = index == 2 ? walls[1]['length'].to_f : 0.0
    angle = index == 1 ? 90.degrees : 180.degrees
    Geom::Transformation.translation([x.mm, y.mm, 0]) *
      Geom::Transformation.rotation(ORIGIN, Z_AXIS, angle)
  end

  def self.module_geometry(model, run_group, item, id, ceiling, parts, upper = false)
    type = item['type']
    return if type == 'reserve'
    width = item['w'].to_f
    height = upper ? item['h'].to_f : BASE_H
    height = [ceiling - PLINTH - 20, 2400].min if %w[oven fridge fridge_free].include?(type)
    depth = upper ? UP_D : BASE_D
    group = run_group.entities.add_group
    group.name = "#{id} #{type} [DRAFT]"
    group.transform!(Geom::Transformation.translation([item['x'].to_f.mm, 0, (upper ? UPPER_Z : PLINTH).mm]))
    attributes(group, 'module_id' => id, 'type' => type, 'width_mm' => width,
               'source' => 'generic-demo', 'quote_parts_reference' => parts.select { |p| p['mod'] == id },
               'production_ready' => false, 'dynamic_component_formulas' => false)
    if %w[base drawers cargo sink hob hob_oven up].include?(type)
      carcass(model, group.entities, id, type, width, height, depth)
    elsif type == 'shelf'
      [0, 350].each do |z|
        box(model, group.entities, "#{id} open shelf", 0, 0, z, width, 250, THICKNESS, '#C0A98C', 'module_id' => id)
      end
    elsif %w[dw filler].include?(type)
      box(model, group.entities, "#{id} facade placeholder", 0, depth, 0, width, THICKNESS, BASE_H,
          '#E7DED2', 'module_id' => id, 'role' => 'facade_placeholder')
    else
      box(model, group.entities, "#{id} envelope only", 0, 0, 0, width, depth, [height, 1].max,
          '#B2B8BE', 'module_id' => id, 'role' => 'unresolved_envelope')
    end
  end

  def self.import_file(path = nil)
    path ||= UI.openpanel('Import DENLI draft JSON', nil, 'JSON Files|*.json||')
    return unless path
    raise ArgumentError, 'Input exceeds 10 MB' if File.size(path) > 10 * 1024 * 1024
    doc = JSON.parse(File.read(path, encoding: 'UTF-8'))
    plan = validate(doc)
    model = Sketchup.active_model
    parts = doc.fetch('quote', {}).fetch('parts', [])
    raise ArgumentError, 'Expected quote parts array' unless parts.is_a?(Array) && parts.all? { |p| p.is_a?(Hash) }
    started = false
    model.start_operation('Import DENLI draft', true)
    started = true
    root = model.entities.add_group
    root.name = 'DENLI draft, NOT FOR PRODUCTION'
    attributes(root, 'schema' => doc['schema'], 'source' => 'generic-demo', 'input_json' => doc.fetch('input', {}),
               'warnings' => plan.fetch('warnings', []), 'production_ready' => false,
               'scope' => 'draft carcasses and envelopes; quote parts are references, not a geometry guarantee')
    wall_groups = plan['walls'].each_with_index.map do |wall, i|
      g = root.entities.add_group
      g.name = "Wall #{i + 1}"
      g.transform!(wall_transform(plan['walls'], i))
      attributes(g, 'length_mm' => wall['length'], 'orientation' => 'assumed_orthogonal')
      g
    end
    runs = plan['walls'].zip(wall_groups)
    if plan['island']
      g = root.entities.add_group
      g.name = 'Island, detached reference (position unknown)'
      offset = plan['walls'].length > 1 ? plan['walls'][1]['length'].to_f + 1500 : 2500
      g.transform!(Geom::Transformation.translation([0, offset.mm, 0]))
      attributes(g, 'placement_status' => 'unpositioned_reference')
      runs << [plan['island'], g]
    end
    base_n = tall_n = 0
    runs.each do |run, group|
      run['items'].each do |item|
        type = item['type']
        id = if %w[filler reserve fridge_free].include?(type)
               "REF-#{group.entityID}-#{item['x']}"
             elsif %w[oven fridge].include?(type)
               tall_n += 1
               "П#{tall_n}"
             else
               base_n += 1
               "Н#{base_n}"
             end
        module_geometry(model, group, item, id, plan['ceiling'].to_f, parts)
      end
    end
    upper_n = 0
    plan['walls'].zip(wall_groups).each do |wall, group|
      wall.fetch('uppers', []).each do |item|
        upper_n += 1
        module_geometry(model, group, item, "В#{upper_n}", plan['ceiling'].to_f, parts, true)
      end
    end
    model.commit_operation
    started = false
    model.selection.clear
    model.selection.add(root)
    model.active_view.zoom(root)
    root
  rescue StandardError => e
    model.abort_operation if started && model
    UI.messagebox("DENLI import failed: #{e.message}")
    warn("DENLI draft: #{e.class}: #{e.message}")
    nil
  end

  unless file_loaded?(__FILE__)
    UI.menu('Extensions').add_item('Import DENLI draft JSON') { import_file }
    file_loaded(__FILE__)
  end
end
