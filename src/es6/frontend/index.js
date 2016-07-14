import { ipcRenderer } from 'electron';
import showdown from 'showdown';
import React from 'react';
import ReactDOM from 'react-dom';

const Styles = {
  textarea: {
    width: '100%',
    height: '100%',
    color: 'rgb(171, 178, 191)',
    backgroundColor: 'rgb(40, 44, 52)'
  },
  viewer: {
    width: '100%',
    height: '100%',
    color: 'rgb(171, 178, 191)',
    backgroundColor: 'rgb(40, 44, 52)'
  }
}

const converter = new showdown.Converter();

// TODO : auto focus
const MarkdownEditor = React.createClass({
  getInitialState() {
    return {
      text: this.props.text
    };
  },
  showViewer() {
    this.props.showViewer();
  },
  handleChange(e) {
    this.setState({ text: e.target.value });
  },
  save() {
    this.props.updateText(this.state.text);
    this.showViewer();
    ipcRenderer.send('save-content-to-file', { text: this.state.text });
  },
  componentDidMount() {
    this.textareaRef.focus();
  },
  handleKeyDown(e) {
    if (e.keyCode === 27) { // z
      this.showViewer();
    }
    if (e.metaKey || e.ctrlKey) {
      if (e.keyCode === 83) { // s
        this.save();
      }
      if (e.keyCode === 65) { // a
        // TODO
      }
      if (e.keyCode === 88) { // x
        // TODO
      }
      if (e.keyCode === 67) { // c
        // TODO
      }
      if (e.keyCode === 86) { // v
        // TODO
      }
    }
  },
  render() {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <textarea
          ref={(ref) => this.textareaRef = ref}
          onKeyDown={this.handleKeyDown} 
          style={Styles.textarea}
          onChange={this.handleChange}
          value={this.state.text}></textarea>
      </div>
    );
  }
});

const MarkdownViewer = React.createClass({
  showEditor() {
    this.props.showEditor();
  },
  handleKeyDown(e) {
    if (e.metaKey || e.ctrlKey) {
      if (e.keyCode === 69) {
        this.showEditor();
      }
    }
  },
  render() {
    const html = converter.makeHtml(this.props.text);
    return (
      <div id="viewer" onKeyDown={this.handleKeyDown} onDoubleClick={this.showEditor} style={Styles.viewer}>
        <span dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }
});

const MarkdownPostIt = React.createClass({
  getInitialState() {
    return {
      edition: false,
      text: this.fetchText(),
    };
  },
  updateText(text) {
    localStorage.setItem('postit-text', text);
  },
  fetchText() {
    return localStorage.getItem('postit-text') || '# Hello PostIt !';
  },
  showEditor() {
    const text = this.fetchText();
    this.setState({ edition: true, text });
  },
  showViewer() {
    const text = this.fetchText();
    this.setState({ edition: false, text });
  },
  render() {
    if (this.state.edition) {
      return <MarkdownEditor
        text={this.state.text}
        updateText={this.updateText}
        fetchText={this.fetchText}
        showViewer={this.showViewer} />
    } else {
      return <MarkdownViewer
        text={this.state.text}
        showEditor={this.showEditor} />
    }
  }
});

function init(initalText) {
  if (initalText) {
    localStorage.setItem('postit-text', initalText)
  }
  ReactDOM.render(<MarkdownPostIt />, document.getElementById('app'));
}

ipcRenderer.on('lifecycle-event', (sender, message) => {
  if (message.event === 'init') {
    init(message.initalText);
  }
});
