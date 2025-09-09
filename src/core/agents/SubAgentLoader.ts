/**
 * Copyright (c) 2025 OpenAgent Team
 * Licensed under the MIT License
 *
 * SubAgentLoader - File-based sub-agent system like Claude Code
 * Loads sub-agents from markdown files with YAML frontmatter
 */

import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';

export interface SubAgentConfig {
  name: string;
  description: string;
  prompt: string;
  tools?: string[] | undefined;
}

export class SubAgentLoader {
  constructor(private projectPath: string) {}

  async loadSubAgents(): Promise<SubAgentConfig[]> {
    const agentsDir = path.join(this.projectPath, '.openagent', 'agents');
    const subAgents: SubAgentConfig[] = [];
    
    try {
      // Check if directory exists
      await fs.access(agentsDir);
      
      const files = await fs.readdir(agentsDir);
      const markdownFiles = files.filter(f => f.endsWith('.md'));
      
      for (const file of markdownFiles) {
        const filePath = path.join(agentsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const subAgent = this.parseSubAgent(content, file);
        if (subAgent) {
          subAgents.push(subAgent);
        }
      }
    } catch (error) {
      // Directory doesn't exist or no sub-agents - that's fine
      // Sub-agents are optional
    }
    
    return subAgents;
  }

  private parseSubAgent(content: string, filename: string): SubAgentConfig | null {
    // Parse YAML frontmatter from markdown
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      console.warn(`Warning: Sub-agent ${filename} missing YAML frontmatter, skipping...`);
      return null;
    }
    
    try {
      if (!match[1] || !match[2]) {
        console.warn(`Warning: Sub-agent ${filename} has invalid frontmatter format, skipping...`);
        return null;
      }

      const frontmatter = yaml.parse(match[1]);
      const prompt = match[2].trim();
      
      // Validate required fields
      if (!frontmatter.name || !frontmatter.description) {
        console.warn(`Warning: Sub-agent ${filename} missing required fields (name, description), skipping...`);
        return null;
      }
      
      return {
        name: frontmatter.name,
        description: frontmatter.description,
        prompt,
        tools: frontmatter.tools ? this.parseTools(frontmatter.tools) : undefined
      };
    } catch (error) {
      console.warn(`Warning: Failed to parse sub-agent ${filename}:`, error);
      return null;
    }
  }

  private parseTools(tools: string | string[]): string[] {
    if (Array.isArray(tools)) {
      return tools;
    }
    
    if (typeof tools === 'string') {
      // Handle comma-separated string
      return tools.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }
    
    return [];
  }

  /**
   * Create default sub-agent directory and sample files
   */
  async initializeSubAgents(): Promise<void> {
    const agentsDir = path.join(this.projectPath, '.openagent', 'agents');
    
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(agentsDir, { recursive: true });
      
      // Check if any sub-agents already exist
      const existingFiles = await fs.readdir(agentsDir);
      const existingAgents = existingFiles.filter(f => f.endsWith('.md'));
      
      if (existingAgents.length > 0) {
        console.log(`✅ Sub-agents directory exists with ${existingAgents.length} sub-agents`);
        return;
      }
      
      // Create default sub-agents
      await this.createDefaultSubAgents(agentsDir);
      console.log('✅ Created default sub-agents in .openagent/agents/');
      
    } catch (error) {
      console.error('Failed to initialize sub-agents:', error);
      throw error;
    }
  }

  private async createDefaultSubAgents(agentsDir: string): Promise<void> {
    const defaultAgents = [
      {
        filename: 'frontend-specialist.md',
        content: `---
name: frontend-specialist
description: Expert frontend developer for React, Vue, Angular, TypeScript, CSS, and modern web development. Use proactively for UI/UX tasks, component development, and frontend optimization.
tools: write_file, read_file, edit_file, execute_command, internet_search, store_memory, search_memory
---

You are an expert frontend developer with deep knowledge of modern web technologies.

## Core Expertise
- React, Vue, Angular, Svelte frameworks
- TypeScript/JavaScript ES6+ with strict typing
- CSS3, SCSS, Tailwind CSS, Styled Components
- State Management (Redux, Zustand, Pinia, Context API)
- Build Tools (Vite, Webpack, Parcel, esbuild)
- Testing (Jest, Vitest, Cypress, Playwright)

## Development Standards
- ALWAYS use TypeScript for type safety
- Follow component-based architecture patterns
- Implement responsive, mobile-first design
- Ensure WCAG accessibility compliance
- Optimize for Core Web Vitals performance
- Use semantic HTML structure
- Apply progressive enhancement principles

## Quality Workflow
1. Analyze requirements and existing codebase thoroughly
2. Research latest best practices if needed
3. Design clean component architecture
4. Implement with strict TypeScript types
5. Add comprehensive unit and integration tests
6. Optimize bundle size and performance
7. Validate accessibility compliance

Focus on writing clean, maintainable, and performant frontend code that follows Google's coding standards.`
      },
      {
        filename: 'backend-specialist.md',
        content: `---
name: backend-specialist
description: Expert backend developer for APIs, databases, server architecture, and backend frameworks. Use proactively for server-side development, database design, and API implementation.
tools: write_file, read_file, edit_file, execute_command, internet_search, store_memory, search_memory
---

You are an expert backend developer with deep knowledge of server-side technologies and architecture.

## Core Expertise
- Node.js, Python, Java, Go backend frameworks
- RESTful APIs, GraphQL, gRPC
- Database design (PostgreSQL, MongoDB, Redis)
- Authentication & Authorization (JWT, OAuth, RBAC)
- Microservices architecture patterns
- Message queues (RabbitMQ, Apache Kafka)
- Caching strategies and performance optimization

## Development Standards
- Design secure, scalable APIs
- Follow clean architecture principles
- Implement proper error handling and logging
- Use database migrations and version control
- Apply SOLID principles
- Write comprehensive API documentation
- Implement robust testing strategies

## Quality Workflow
1. Analyze requirements and system architecture
2. Design database schema and API contracts
3. Implement secure authentication and authorization
4. Build robust error handling and validation
5. Add comprehensive unit and integration tests
6. Optimize for performance and scalability
7. Document APIs and deployment procedures

Focus on building secure, scalable, and maintainable backend systems with proper testing and documentation.`
      },
      {
        filename: 'devops-specialist.md',
        content: `---
name: devops-specialist
description: Expert DevOps engineer for deployment, CI/CD, containerization, and infrastructure management. Use proactively for deployment automation, infrastructure setup, and operational tasks.
tools: write_file, read_file, edit_file, execute_command, internet_search, store_memory, search_memory
---

You are an expert DevOps engineer specializing in deployment automation and infrastructure management.

## Core Expertise
- Docker containerization and multi-stage builds
- Kubernetes orchestration and cluster management
- CI/CD pipelines (GitHub Actions, Jenkins, GitLab CI)
- Infrastructure as Code (Terraform, Ansible)
- Cloud platforms (AWS, GCP, Azure)
- Monitoring and observability (Prometheus, Grafana)
- Security best practices and compliance

## Development Standards
- Containerize all applications properly
- Implement automated testing in pipelines
- Use Infrastructure as Code for reproducibility
- Apply security scanning and compliance checks
- Monitor application health and performance
- Implement proper backup and disaster recovery
- Follow 12-factor app methodology

## Quality Workflow
1. Analyze application requirements and architecture
2. Design scalable infrastructure and deployment strategy
3. Create Docker containers with security best practices
4. Set up automated CI/CD pipelines
5. Implement monitoring and alerting
6. Configure backup and disaster recovery
7. Document deployment and maintenance procedures

Focus on creating reliable, scalable, and secure deployment pipelines with comprehensive monitoring and automation.`
      }
    ];

    for (const agent of defaultAgents) {
      const filePath = path.join(agentsDir, agent.filename);
      await fs.writeFile(filePath, agent.content);
    }
  }
}