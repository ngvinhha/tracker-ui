import React from 'react';
import URLSearchParams from 'url-search-params';
import {Panel, Pagination, Button} from 'react-bootstrap';

import IssueFilter from './IssueFilter.jsx';
import IssueTable from './IssueTable.jsx';
import IssueAdd from './IssueAdd.jsx';
import graphQLFetch from './graphQLFetch.js';
import store from './store.js'
import IssueDetail from './IssueDetail.jsx';
import withToast from './withToast.jsx';
import PageLink from './PageLink.jsx';

const SECTION_SIZE=5;

class IssueList extends React.Component {
  static async fetchData(match,search,showError){
    const params=new URLSearchParams(search);
    const vars={hasSelection: false,selectedId:0};

    const {params: {id}}=match;
    const idInt=parseInt(id,10);
    if(!Number.isNaN(idInt)){
      vars.hasSelection=true;
      vars.selectedId=idInt;
    }

    if (params.get('status')) vars.status = params.get('status');
    let page=parseInt(params.get('page'),10);
    if(Number.isNaN(page)) page=1;
    vars.page=page;

    const effortMin = parseInt(params.get('effortMin'), 10);
    if (!Number.isNaN(effortMin)) vars.effortMin = effortMin;
    const effortMax = parseInt(params.get('effortMax'), 10);
    if (!Number.isNaN(effortMax)) vars.effortMax = effortMax;

    const query = `query issueList(
      $status: StatusType
      $effortMin: Int
      $effortMax: Int
      $hasSelection: Boolean!
      $selectedId: Int!
      $page: Int
    ) {
      issueList (
        status: $status
        effortMin: $effortMin
        effortMax: $effortMax
        page: $page
      ) {
        issues {
          id title status owner
          created effort due
        }
        pages
      }
      issue(id:$selectedId) @include (if: $hasSelection) {
        id description
      }
    }`;

    const data = await graphQLFetch(query, vars, showError);
    return data;
    
  }
  constructor() {
    super();
    const initialData=store.initialData||{issueList: {}};
    const {
      issueList: {issues,pages},
      issue: selectedIssue,
    }=initialData;
    delete store.initialData;
    this.state = { 
      issues,
      selectedIssue,
      pages,
    };
    this.createIssue = this.createIssue.bind(this);
    this.closeIssue = this.closeIssue.bind(this);
    this.deleteIssue = this.deleteIssue.bind(this);
  }

  componentDidMount() {
    const {issues}=this.state;
    if(issues==null) this.loadData();
  }

  componentDidUpdate(prevProps) {
    const { 
      location: { search: prevSearch },
      match: {params:{id: prevId}}
    } = prevProps;
    const { 
      location: { search },
      match: {params: {id}}
    } = this.props;

    if (prevSearch !== search || prevId!==id) {
      this.loadData();
    }
  }

  async loadData() {
    const { location: { search },match } = this.props;
    const data=await IssueList.fetchData(match,search,this.showError);
    if (data) {
      this.setState({ 
        issues: data.issueList.issues,
        selectedIssue: data.issue,
        pages: data.issueList.pages 
      });
    }
  }

  async createIssue(issue) {
    const {showError}=this.props;
    const query = `mutation issueAdd($issue: IssueInputs!) {
      issueAdd(issue: $issue) {
        id
      }
    }`;

    const data = await graphQLFetch(query, { issue },showError);
    if (data) {
      this.loadData();
    }
  }

  async closeIssue(index) {
    const {showError} =this.props;
    const query = `mutation issueClose($id: Int!) {
      issueUpdate(id: $id,changes: {status: Closed}) {
        id title status owner
        effort created due description
      }
    }`;
    const { issues } = this.state;
    const data = await graphQLFetch(query, { id: parseInt(issues[index].id) },showError);
    if (data) {
      this.setState((prevState) => {
        const newList = [...prevState.issues];
        newList[index] = data.issueUpdate;
        return { issues: newList };
      })
    } else {
      this.loadData();
    }
  }

  async deleteIssue(index) {
    const {showSuccess,showError} = this.props;
    const query = `mutation issueDelete($id: Int!) {
      issueDelete(id: $id)
    }`;
    const { issues } = this.state;
    const { location: { pathname, search }, history } = this.props;
    const { id } = issues[index];
    const data = await graphQLFetch(query, { id: parseInt(id) },showError);
    if (data && data.issueDelete) {
      this.setState((prevState) => {
        const newList = [...prevState.issues];
        if (pathname === `/issues/${id}`) {
          history.push({ pathname: '/issues', search });
        }
        newList.splice(index, 1);
        return { issues: newList };
      });
      const undoMessage=(
        <span>
          {`Deleted issue ${id} successfully.`}
          <Button bsStyle="link" onClick={()=>this.restoreIssue(id)}>
            Undo
          </Button>
        </span>
      );
      showSuccess(undoMessage);
    } else {
      this.loadData();
    }
  }

  async restoreIssue(id){
    const query=`mutation issueRestore($id: Int!) {
      issueRestore(id: $id)
    }`;
    const {showSuccess,showError}=this.props;
    const data = await graphQLFetch(query, {id: parseInt(id,10)},showError);
    if(data) {
      showSuccess(`Issue ${id} restored successfully.`);
      this.loadData();
    }
  }

  render() {
    const { issues, selectedIssue, pages } = this.state;
    if(issues==null) return null;
    const { location: {search} } = this.props;

    const params =new URLSearchParams(search);
    let page=parseInt(params.get('page'),10);
    if(Number.isNaN(page)) page=1;

    const startPage=Math.floor((page-1)/SECTION_SIZE) * SECTION_SIZE + 1;
    const endPage=startPage+SECTION_SIZE-1;
    const prevSection=startPage===1?0:startPage-SECTION_SIZE;
    const nextSection=endPage >= pages ? 0: startPage+SECTION_SIZE;

    const items=[];
    for(let i=startPage;i<=Math.min(endPage,pages);i+=1){
      params.set('page',i);
      items.push((
        <PageLink key={i} params={params} activePage={page} page={i}>
          <Pagination.Item>{i}</Pagination.Item>
        </PageLink>
      ))
    }

    return (
      <React.Fragment>
        <Panel>
          <Panel.Heading>
            <Panel.Title toggle>Filter</Panel.Title>
          </Panel.Heading>
          <Panel.Body collapsible>
          <IssueFilter urlBase="/issues" />
          </Panel.Body>
        </Panel>
        
        <IssueTable
          issues={issues}
          closeIssue={this.closeIssue}
          deleteIssue={this.deleteIssue} />
        <IssueAdd createIssue={this.createIssue} />
        <IssueDetail issue={selectedIssue} />
        
        <Pagination>
          <PageLink params={params} page={prevSection}>
            <Pagination.Item>{'<'}</Pagination.Item>
          </PageLink>
          {items}
          <PageLink params={params} page={nextSection}>
            <Pagination.Item>{'>'}</Pagination.Item>
          </PageLink>
        </Pagination>
      </React.Fragment>
    );
  }
}
const IssueListWithToast=withToast(IssueList);
IssueListWithToast.graphQLFetch=IssueList.graphQLFetch;
export default IssueListWithToast;
