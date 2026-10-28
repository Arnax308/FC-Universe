import { Component } from 'react'
import { ErrorState } from './ui'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <div className="p-6"><ErrorState error={this.state.error} title="This screen crashed" /></div>
    }
    return this.props.children
  }
}
