use parser::{parse_musicxml, to_yaml};

#[test]
fn parses_minimal_musicxml() {
    let xml = r#"<score-partwise version="3.1">
                   <part id="P1"><measure number="1"/></part>
                 </score-partwise>"#;

    let events = parse_musicxml(xml).expect("parse ok");
    assert_eq!(events.len(), 1);             // one measure
    let yaml = to_yaml(&events).unwrap();
    assert!(yaml.contains("M1"));            // id appears in YAML
}

