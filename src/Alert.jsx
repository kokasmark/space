import { Component } from "react";

import { PiPlugsConnectedDuotone } from "react-icons/pi";
import { PiPlugsDuotone } from "react-icons/pi";
import { MdInfoOutline } from "react-icons/md";

class Alert extends Component{
    state={
        alerts: []
    }
    fire(message, role, time) {
        if (message.length === 0) return;
    
        let id = Math.random();
    
        // Use functional setState to ensure you're using the latest state
        

        setTimeout(() => {
            this.setState(prevState => {
                const offset = prevState.alerts.length*time;
                const newAlerts = [...prevState.alerts, { message, role, time: time, id }];
                return { alerts: newAlerts };
            });
            setTimeout(() => {
                this.setState(prevState => {
                    // Filter out the alert using the latest state
                    const filteredAlerts = prevState.alerts.filter(a => a.id !== id);
                    return { alerts: filteredAlerts };
                });
            }, time);
        }, this.state.alerts.length*100);
    
        
    }
    
    render(){
        const {alerts} = this.state;
       return(
        <div className="alert-container">
            {
             alerts.map((alert,index) => (
                <div className={`Alert ${alert.role}`} key={'alert-'+index} style={{animation: `alert-fade-out ${alert.time+10}ms linear`}}>
                    {alert.role === "error" && <PiPlugsDuotone className="icon"/>}
                    {alert.role === "success" && <PiPlugsConnectedDuotone className="icon"/>}
                    {alert.role === "info" && <MdInfoOutline className="icon"/>}
                    <p>{alert.message}</p>
                </div>
             ))   
            }
       </div>); 
    }
}

export default Alert;