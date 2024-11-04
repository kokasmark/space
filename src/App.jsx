import { FaSatelliteDish } from 'react-icons/fa';
import './App.css';
import { Component, createRef } from 'react'
import { MdSatelliteAlt } from "react-icons/md";
import Xarrow, { useXarrow } from 'react-xarrows';
import { xml2js } from 'xml-js';
import spacecrafts from './spacecraft.json';
import { TbWaveSine } from 'react-icons/tb';
import { GiElectric } from 'react-icons/gi';
import { GrSpectrum } from 'react-icons/gr';
import { BsSpeedometer2 } from 'react-icons/bs';
import { BiInfoCircle } from 'react-icons/bi';
import Alert from './Alert';


const Satellite = ({ satellite, index, parent }) => {
  return (
    <div className='satellite space-body' id={satellite.name}
      style={{
        zIndex: 10,
        background: "black"
      }} onClick={() => parent.setState({ selected: satellite })}>
      {satellite.distance > 0 ? <MdSatelliteAlt className='icon' /> : <FaSatelliteDish className='icon' />}
      <p className='name'>{satellite.name}</p>
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
    groups: [],
    signals: [],
    markers: [],
    selected: null,
    isCtrlPressed: false,
    scrollDelta: 0
  }
  alerts = createRef();
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

    dishes.forEach(dish => {
      let { target, _attributes } = dish;
      let targets = Array.isArray(target) ? target : [target];
      let s = spacecrafts;
      targets.forEach(t => {
        const attributes = t._attributes;
        if (satellites.filter((a) => a.name == attributes.name).length == 0) {
          satellites.push({
            type: "satellite",
            name: attributes.name,
            distance: parseFloat(attributes.rtlt) > -1.0 ? ((parseFloat(attributes.rtlt) * 300000) / 2) / 149597870.7 : 0,
            scale: 1,
            color: 'white',
            friendlyName: s.spacecraft.filter((s) => s._name === attributes.name.toLowerCase())[0]?._friendlyName,
            signals: [],
            rtlt: attributes.rtlt
          });
        }
      });

      satellites = satellites.sort((a, b) => a.distance - b.distance);
      const threshold = 0.5;
      const groups = []; // Initialize an array to store groups of satellites

      satellites.forEach((satellite) => {
        let addedToGroup = false;

        let index = 0;
        for (let group of groups) {
          const referenceSatellite = group[0];
          if (Math.abs(satellite.distance - referenceSatellite.distance) < threshold) {
            satellite.groupIndex = index;
            group.push(satellite);
            addedToGroup = true;
            break;
          }
          index++;
        }
        if (!addedToGroup) {
          satellite.groupIndex = groups.length;
          groups.push([satellite]);
        }
      });

      this.setState({ groups });

      let downSignal = dish.downSignal;
      if (downSignal) {
        let downSignals = Array.isArray(downSignal) ? downSignal : [downSignal];
        downSignals.forEach(signal => {
          const signalAttributes = signal._attributes;
          if (signals.filter((a) => a.start.includes(signalAttributes.spacecraft)).length == 0) {
            signals.push({
              start: "Earth",
              end: `group-${satellites.filter((a) => a.name == signalAttributes.spacecraft)[0].groupIndex}`,
              dataRate: signalAttributes.dataRate,
              frequency: signalAttributes.frequency,
              power: signalAttributes.power,
              timeToReach: parseFloat(satellites.filter((a) => a.name == signalAttributes.spacecraft)[0].rtlt) / 20
            });
          }
          try {
            let satellite = satellites.filter((a) => a.name == signalAttributes.spacecraft)[0];
            satellite.signals = [...satellite.signals, signalAttributes];
          } catch {

          }
        });
      }
      let upSignal = dish.upSignal;
      if (upSignal) {
        let upSignals = Array.isArray(upSignal) ? upSignal : [upSignal];
        upSignals.forEach(signal => {
          const signalAttributes = signal._attributes;
          if (signals.filter((a) => a.end.includes(signalAttributes.spacecraft)).length == 0) {
            signals.push({
              start: "Earth",
              end: `group-${satellites.filter((a) => a.name == signalAttributes.spacecraft)[0].groupIndex}`,
              dataRate: signalAttributes.dataRate,
              frequency: signalAttributes.frequency,
              power: signalAttributes.power,
              timeToReach: parseFloat(satellites.filter((a) => a.name == signalAttributes.spacecraft)[0].rtlt) / 20
            });
          }
          try {
            let satellite = satellites.filter((a) => a.name == signalAttributes.spacecraft)[0];
            satellite.signals = [...satellite.signals, signalAttributes];
          } catch {

          }
        });
      }
    });

    if (this.alerts.current) {
      this.alerts.current.fire("Data updated!","info",1000)
    }
    const markers = Array.from({ length: Math.ceil(Math.max(...satellites.map(s => s.distance))) }, (_, i) => (i + 1))
    this.setState({
      satellites,
      signals,
      markers
    });
  }
  getSignalOpacity(power) {
    power = parseFloat(power)
    if (power === 0.0) {
      return 0.1;
    }
    else if (power <= 2.5) {
      return 0.25;
    }
    else if (power <= 5.0) {
      return 0.5;
    }
    else if (power <= 7.5) {
      return 0.75;
    }
    else if (power >= 10) {
      return 1.0;
    }
  }
  componentDidMount() {
    this.loadSatellites();
    const scrollContainer = document.querySelector('.space');

    scrollContainer.addEventListener('wheel', (event) => {
      event.preventDefault();
      scrollContainer.scrollLeft += event.deltaY; // Applies vertical scroll delta to horizontal scroll
      this.setState({ scrollDelta: scrollContainer.scrollLeft / scrollContainer.scrollWidth })
    });

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    this.fetchPlanetData()

  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
  handleKeyDown = (event) => {
    // Check if the CTRL key is pressed
    if (event.ctrlKey) {
      this.setState({ isCtrlPressed: true });
    }
  };

  handleKeyUp = (event) => {
    // Check if the CTRL key is released
    if (!event.ctrlKey) {
      this.setState({ isCtrlPressed: false });
    }
  };
  scrollToBody(signal) {
    const scrollContainer = document.querySelector('.space');
    const element = document.getElementById(this.state.isCtrlPressed ? signal.start : signal.end);
    if (element) {
      const rect = element.getBoundingClientRect();

      // Use only the horizontal (x-axis) scroll
      scrollContainer.scrollTo({
        left: rect.x + scrollContainer.scrollLeft,
        behavior: 'smooth'
      });
    }
    this.setState({ scrollDelta: scrollContainer.scrollLeft / scrollContainer.scrollWidth })
  }

  async fetchPlanetData() {
    const planets = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
    const distances = [];

    for (const planet of planets) {
      const response = await fetch(`https://api.le-systeme-solaire.net/rest/bodies/${planet.toLowerCase()}`);
      const data = await response.json();
      distances.push({ name: planet, distanceFromSun: data.semimajorAxis / 149597870.7 }); // Convert km to AU
    }
    let updatedPlanets = this.state.planets;
    for (var i = 0; i < distances.length; i++) {
      updatedPlanets[i + 1].distance = distances[i].distanceFromSun
    }
    this.setState({ planets: updatedPlanets })
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.satellites !== this.state.satellites) {
      const newSatellites = this.state.satellites;
      const prevSatellites = prevState.satellites;

      const newSatelliteNames = new Set(newSatellites.map(satellite => satellite.name));
      const prevSatelliteNames = new Set(prevSatellites.map(satellite => satellite.name));

      let count = 0;
      // Check for newly connected satellites
      newSatellites.forEach(satellite => {
        if (!prevSatelliteNames.has(satellite.name)) {
          if (this.alerts.current) {
            this.alerts.current.fire(`${satellite.name} connected!`, "success", 2000+count*100);
          }
          count++;
        }
      });
      count = 0;
      // Check for disconnected satellites
      prevSatellites.forEach(satellite => {
        if (!newSatelliteNames.has(satellite.name)) {
          if (this.alerts.current) {
            this.alerts.current.fire(`${satellite.name} disconnected!`, "error", 2000+count*100);
          }
          count++;
        }
      });

      if (!this.loadTimeout) {
        this.loadTimeout = setTimeout(() => {
          this.loadSatellites();
          this.loadTimeout = null;
        }, 5000);
      }
    }
  }

  render() {
    const { selected } = this.state;
    return (
      <div className="App">
        <div className='background' style={{ left: `${-this.state.scrollDelta * 200}%` }} />
        <div className='space'>
          {this.state.markers.map((marker, index) => (
            <div style={{
              position: 'absolute', top: 0, left: `${marker * 100}%`,
              color: 'white', width: 200, display: 'flex',
              flexDirection: 'column', justifyContent: 'center', textAlign: 'center', alignItems: 'center', transform: 'translateX(-75px)'
            }}>
              <div style={{ backgroundColor: '#4ba3eb', borderRadius: '0px 0px 50% 50%', padding: 20 }}>
                <h1 style={{ margin: 0 }}>{marker} AU</h1>
                <p>({Math.round(marker * 149597870.7 / 1000000)} million km)</p>
              </div>
              <span style={{ width: 2, height: '100vh', backgroundColor: '#4ba3eb' }}></span>
            </div>
          ))}
          {this.state.signals.map((signal, index) => (
            <div className={`arrow`} info={`${signal.timeToReach}`}
              style={{ opacity: this.getSignalOpacity(signal.power), animationDuration: `${signal.timeToReach}s` }}
              onClick={() => this.scrollToBody(signal)}>
              <Xarrow start={signal.start} end={signal.end} key={`signal-${index}`}
                color={"#4ba3eb"}
                path='smooth'
                showHead={false}
                strokeWidth={2}
                curveness={0.8}
              />
            </div>
          ))}
          {
            this.state.groups.map((group, groupIndex) => (
              <div key={`group-${groupIndex}`} id={`group-${groupIndex}`} 
              className={`group ${group.length === 1 ? 'visible' : ''}`}  
              style={{left: `${(1.0 + group[0].distance) * 100}%`}}>
                {group.length > 1 &&<h1 className='num'>{group.length}</h1>}
                <div className={`satellites`}>
                {group.map((satellite, index) => (
                  <Satellite 
                    satellite={satellite} 
                    key={`satellite-${groupIndex}-${index}`} 
                    index={index} 
                    parent={this} 
                  />
                ))}
                </div>
              </div>
            ))
          }

          {
            this.state.planets.map((body, index) => (
              <div className='space-body' id={body.name} key={`planet-${index}`}
                style={{ left: `${body.distance * 100}%`, scale: body.scale, backgroundColor: body.color }}>

              </div>
            ))
          }

          <div className='about'>
            <h1>Deep Space Network</h1>
            <h3>Interactive Map</h3>

            <p>Distances are in Astronomical Units and they are in scale.
              Click on a signal's line and it will scroll from one end to the other.
              Click on a satellite to view various data by hovering the handle at the bottom of the page.
              Freely scroll to feel the true scale of <b>space</b>...
            </p>
            <p>Created by: Kokas Márk</p>
          </div>
        </div>
        <div className='more'>
          {selected != null ?
            <div className='satellite-info'>
              <h3>{selected.friendlyName}</h3>
              <img width={'90%'} style={{ borderRadius: 10 }} src={`https://eyes.nasa.gov/apps/dsn-now/images/spacecraft/${selected.friendlyName.toLowerCase().replace(" ", "%20")}.jpg`} />

              <h3>Information</h3>
              <p><b>{selected.distance}</b> AU from Earth.</p>
              <p><b>{selected.rtlt}</b>s round trip of light.</p>
              <h3>Signal Information</h3>
              <div className='signals'>
                {
                  selected.signals.map((signal, index) => (
                    <div className='signal' style={{ opacity: signal.active === "true" ? 1 : 0.3 }}>
                      <div className='data'><TbWaveSine /> <p><b>{parseFloat(signal.frequency)}</b> hz</p></div>
                      <div className='data'><GiElectric /> <p><b>{parseFloat(signal.power)}</b> dbm</p></div>
                      <div className='data'><GrSpectrum /> <p><b>{signal.band}</b> band</p></div>
                      <div className='data'><BsSpeedometer2 /> <p><b>{parseFloat(signal.dataRate) > 1024 ? parseFloat(signal.dataRate) / 1024 : parseFloat(signal.dataRate)}</b> {parseFloat(signal.dataRate) > 1024 ? 'kb/s' : 'b/s'}</p></div>
                      <div className='data'><BiInfoCircle /> <p>Type <b>{signal.signalType}</b></p></div>
                    </div>
                  ))
                }
              </div>
            </div>
            : <div className='satellite-info'><h1>No satellite selected.</h1></div>}
        </div>
        <Alert ref={this.alerts}/>
      </div>
    );
  }
}

export default App;
