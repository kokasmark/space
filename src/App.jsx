import { FaSatelliteDish } from 'react-icons/fa';
import './App.css';
import { Component,useEffect } from 'react'
import { MdSatelliteAlt } from "react-icons/md";
import Xarrow, { useXarrow } from 'react-xarrows';
import { xml2js } from 'xml-js';
import spacecrafts from './spacecraft.json';


const Satellite = ({ satellite,index }) => {
  return (
    <div className='satellite space-body' id={satellite.name}
      style={{ left: `${(1.0 + satellite.distance) * 100}%`, zIndex:10, transform: `translateY(${satellite.offsetY}px)`}}>
         {satellite.distance > 0 ? <MdSatelliteAlt className='icon'/> : <FaSatelliteDish className='icon'/>}
        <p className='name'>{satellite.name}</p>
        <div className='friendly-name'>
          <h2>{satellite.friendlyName}</h2>
          <img src={`https://eyes.nasa.gov/apps/dsn-now/images/spacecraft/${satellite.friendlyName.toLowerCase().replace(" ", "%20")}.jpg`} />
          <ul>
            <li>{satellite.distance} AU from Earth</li>
          </ul>
        </div>
    </div>
  );
}

class App extends Component {
  state = {
    planets: [
      { type: 'planet', name: 'Sun', distance: 0, scale: '109', color: 'gray' },
      { type: 'planet', name: 'Mercury', distance: 0.39, scale: '0.38', color: 'gray' },
      { type: 'planet', name: 'Venus', distance: 0.72, scale: '0.95', color: 'orange' },
      { type: 'planet', name: 'Earth', distance: 1.00, scale: '1', color: 'blue' },
      { type: 'planet', name: 'Mars', distance: 1.52, scale: '0.53', color: 'red' },
      { type: 'planet', name: 'Jupiter', distance: 5.20, scale: '11.20', color: 'brown' },
      { type: 'planet', name: 'Saturn', distance: 9.58, scale: '9.45', color: 'gold' },
      { type: 'planet', name: 'Uranus', distance: 19.22, scale: '4.00', color: 'lightblue' },
      { type: 'planet', name: 'Neptune', distance: 30.07, scale: '3.88', color: 'blue' },
    ],

    satellites: [],
    signals: []
  }
  loadTimeout = null;
  async dsnData() {
    const requestOptions = {
      method: "GET",
      redirect: "follow"
    };

    try {
      const response = await fetch("https://eyes.nasa.gov/dsn/data/dsn.xml", requestOptions);
      const result = await response.text();
      return xml2js(result, {
        compact: true,
        spaces: 2
      });
    } catch (error) {
      console.error(error);
    };
  }
  async loadSatellites() {
    let data = await this.dsnData();
    let dishes = data.dsn.dish;

    let satellites = [];
    let signals = [];

    console.log(dishes)
    
    dishes.forEach(dish => {
      let { target, _attributes } = dish;
      let targets = Array.isArray(target) ? target : [target];
      let s = spacecrafts;
      targets.forEach(t => {
        const attributes = t._attributes;
        satellites.push({
          type: "satellite",
          name: attributes.name,
          distance: parseFloat(attributes.rtlt) > -1.0 ? parseFloat(attributes.uplegRange) / 149597870.7 : 0,
          scale: 1,
          color: 'white',
          offset: this.getOrbitPoint(2),
          friendlyName: s.spacecraft.filter((s) => s._name === attributes.name.toLowerCase())[0]?._friendlyName
        });
      });
      satellites = satellites.sort((a, b) => a.distance - b.distance);

      const threshold = 0.5; // Define the distance threshold for overlap
      const yOffsetIncrement = 50; // Define the offset increment for each satellite

      satellites.forEach((satellite, index) => {
        let yOffset = 0;

        // Compare with previous satellites to check for overlap
        for (let i = 0; i < index; i++) {
          const otherSatellite = satellites[i];
          
          // Check if distances are close enough to need offset adjustment
          if (Math.abs(satellite.distance*10 - otherSatellite.distance*10) < threshold) {
            yOffset += yOffsetIncrement;
          }
        }

        satellite.offsetY = yOffset;
      });
      let downSignal = dish.downSignal;
      if (downSignal) {
        let downSignals = Array.isArray(downSignal) ? downSignal : [downSignal];
        downSignals.forEach(signal => {
          const signalAttributes = signal._attributes;
          signals.push({
            start: signalAttributes.spacecraft,
            end: "Earth",
            dataRate: signalAttributes.dataRate,
            frequency: signalAttributes.frequency,
            class: "down"
          });
        });
      }
      let upSignal = dish.upSignal;
      if (upSignal) {
        let upSignals = Array.isArray(upSignal) ? upSignal : [upSignal];
        upSignals.forEach(signal => {
          const signalAttributes = signal._attributes;
          signals.push({
            start: "Earth",
            end: signalAttributes.spacecraft,
            dataRate: signalAttributes.dataRate,
            frequency: signalAttributes.frequency,
            class: "up"
          });
        });
      }
    });

    this.setState({
      satellites,
      signals
    });
    if (!this.loadTimeout){
      this.loadTimeout = setTimeout(() => {
        this.loadSatellites();
      }, 5000);
    }
  }
  getOrbitPoint(radius) {
    const angleInRadians = (Math.random() * 360) * (Math.PI / 180); // Convert degrees to radians
    const x = radius * Math.cos(angleInRadians) * 100;
    const y = radius * Math.sin(angleInRadians) * 100;
    return { x, y };
  }
  componentDidMount() {
    this.loadSatellites()
  }
  render() {
    return (
      <div className="App">
        {this.state.signals.map((signal, index) => (
          <div className={`arrow`} info={`Data-rate: ${signal.dataRate}`}>
            <Xarrow start={signal.start} end={signal.end} key={`signal-${index}`} 
            color={"#4ba3eb"} 
            path='smooth'
            showHead={false}
            strokeWidth={2}
            curveness={0.4}
            />
          </div>
        ))}
        <div className='space'>
          {
            this.state.satellites.map((satellite, index) => (
              <Satellite satellite={satellite} key={`satellite-${index}`} index={index}/>
            ))
          }
          {
            this.state.planets.map((body, index) => (
              <div className='space-body' id={body.name}  key={`planet-${index}`}
                style={{ left: `${body.distance * 100}%`, transform: `scale(${body.scale})`, backgroundColor: body.color }}>

              </div>
            ))
          }
        </div>

      </div>
    );
  }
}

export default App;
