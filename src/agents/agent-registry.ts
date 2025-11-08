import { Agent } from './agent.interface';

export class AgentRegistry {
  private agents: Agent[] = [];

  register(agent: Agent) {
    this.agents.push(agent);
  }

  getAgents(): Agent[] {
    return this.agents;
  }
}
