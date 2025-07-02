use parser::{parse_musicxml, to_yaml};

#[test]
fn yaml_includes_part_names() {
    let xml = include_str!("fixtures/multipart.xml");
    let events = parse_musicxml(xml).expect("parse ok");
    let yaml = to_yaml(&events).expect("yaml ok");
    assert!(yaml.contains("Violin I"));
    assert!(yaml.contains("Violin II"));
    assert!(yaml.contains("Cello"));
}
