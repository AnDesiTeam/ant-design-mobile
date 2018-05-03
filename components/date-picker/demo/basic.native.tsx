// tslint:disable:jsx-no-multiline-js
/* tslint:disable:no-console */
import { DatePicker, List } from 'antd-mobile';
import * as React from 'react';
import { View } from 'react-native';

const now = new Date();

export default class PopupExample extends React.Component<any, any> {
  date1MinDate: any;
  date1MaxDate: any;

  constructor(props: any) {
    super(props);
    this.state = {
      value: undefined,
    };
  }

  onChange = (value: any) => {
    this.setState({ value });
  }

  render() {
    return (
      <View>
        <List>
          <DatePicker
            defaultDate={now}
            value={this.state.value}
            mode="date"
            minDate={
              this.date1MinDate || (this.date1MinDate = new Date(2015, 7, 6))
            }
            maxDate={
              this.date1MaxDate || (this.date1MaxDate = new Date(2016, 11, 3))
            }
            onChange={this.onChange}
            format="YYYY-MM-DD"
          >
            <List.Item arrow="horizontal">Select Date</List.Item>
          </DatePicker>
        </List>
      </View>
    );
  }
}
