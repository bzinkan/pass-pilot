import React from 'react';

export default class ErrorBoundary extends React.Component<any, {err?: any}> {
  constructor(p: any) { 
    super(p); 
    this.state = {}; 
  }
  
  static getDerivedStateFromError(err: any) { 
    return { err }; 
  }
  
  render() {
    if (this.state.err) {
      return <pre style={{padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap'}}>
        {String(this.state.err?.message || this.state.err)}
        {this.state.err?.stack && '\n\n' + this.state.err.stack}
      </pre>;
    }
    return this.props.children as any;
  }
}