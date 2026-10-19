import { registry } from "../events/registry.js";
import { echoInput } from "../classification/handlers/inputHandler.js";
import { EventType } from "../events/event.types.js";

export const registerHandler = () => {
    registry.register(
        {
            handler_id: "echo-input",
            event_type: EventType.INPUT_RECEIVED,
            execution_type: "io",
            priority: 10,
            max_retries: 3,
            fn: echoInput,
        }
    )
    console.log("registry loaded sucessfully", registry);
    
}