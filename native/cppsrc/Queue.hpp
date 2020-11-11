#pragma once

#include <condition_variable>
#include <queue>
#include <mutex>

template <typename T>
class Queue
{
public:
  Queue() {};
  virtual ~Queue() {};

public:
  void addItem(T item);
  bool waitItem(T* item, int timeout);

  int size();
  bool empty();
  void clear();

protected:
  void notify();

protected:
  std::queue<T> itemQueue;
  std::mutex queueMutex;
  std::condition_variable queueEvent;
};

template <typename T>
void Queue<T>::addItem(T item)
{
  std::unique_lock<std::mutex> lock(queueMutex);
  itemQueue.push(item);
  notify();
}

template <typename T>
bool Queue<T>::waitItem(T* item, int timeout)
{
  std::unique_lock<std::mutex> lock(this->queueMutex);
  if (this->itemQueue.empty() && (timeout > 0))
  {
    queueEvent.wait_for(lock, std::chrono::milliseconds(timeout));
  }
  if (this->itemQueue.empty())
  {
    return false;
  }
  *item = this->itemQueue.front();
  this->itemQueue.pop();
  return true;
}

template <typename T>
int Queue<T>::size()
{
  std::unique_lock<std::mutex> lock(queueMutex);
  int size = itemQueue.size();
  return size;
}

template <typename T>
bool Queue<T>::empty()
{
  return (size() == 0);
}

template <typename T>
void Queue<T>::clear()
{
  std::unique_lock<std::mutex> lock(queueMutex);
  while (!itemQueue.empty())
  {
    itemQueue.pop();
  }
}

template <typename T>
void Queue<T>::notify()
{
  queueEvent.notify_one();
}
